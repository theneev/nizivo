/**
 * The `data-slot` elements a component renders and the `data-*` attributes each can carry
 * (ARCHITECTURE.md §8.2, §8.3), read from the component's source with ts-morph as a parser only:
 * no type checker, no module resolution.
 *
 * - A slot is a JSX `data-slot="x"` attribute or an object-literal `'data-slot': 'x'` property; its
 *   attributes are the other `data-*` names on the same element or object, plus `...stateAttrs(…)`.
 * - An element whose tag is `Engine.<Part>` hands its props to the engine adapter
 *   (`src/_engines/<engine>/<name>.client.tsx`, through `engine.ts`), which adds the attributes of
 *   every `stateAttrs(…)` it merges with them (`mergeProps(…, dom, stateAttrs(s))`). A named object
 *   prop (`positioner={{ 'data-slot': … }}`) is followed the same way through that parameter.
 * - State keys map to attribute names through the PRESENCE and VALUED tables in
 *   `src/contracts/state.ts`, the tables `stateAttrs()` itself uses.
 * - The root slot of a component is the `data-slot` of the element its `return` renders (through
 *   wrappers such as a context provider), or of the props object it passes to `renderElement()`.
 *   Every other slot it writes is an inner slot. A slot written by a module-level helper belongs to
 *   the one exported component that calls it.
 *
 * Anything this cannot read fails with the file and the name rather than being guessed.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  type ArrowFunction,
  type CallExpression,
  type FunctionDeclaration,
  type FunctionExpression,
  Node,
  type ObjectLiteralExpression,
  type Project,
  type SourceFile,
  SyntaxKind,
  type VariableDeclaration,
} from 'ts-morph';

export interface SlotOccurrence {
  slot: string;
  /** The exported component function that renders it. */
  component: string;
  /** The element the component renders as its root. */
  root: boolean;
  /** Every `data-*` name the element can carry, `data-slot` excluded. */
  attributes: string[];
}

export interface SlotScan {
  occurrences: SlotOccurrence[];
  errors: string[];
}

type FunctionLike = FunctionDeclaration | ArrowFunction | FunctionExpression;

const SKIP = /\.(?:test|spec|example|stories)\.tsx?$|\.d\.ts$/;

/** `stateAttrs()` keys → attribute names, from the PRESENCE and VALUED tables of `state.ts`. */
export function readStateTable(project: Project, stateFile: string): Map<string, string> {
  const file = project.addSourceFileAtPath(stateFile);
  const table = new Map<string, string>();
  for (const name of ['PRESENCE', 'VALUED']) {
    let initializer = file.getVariableDeclaration(name)?.getInitializer();
    while (Node.isAsExpression(initializer) || Node.isSatisfiesExpression(initializer)) {
      initializer = initializer.getExpression();
    }
    if (initializer === undefined || !Node.isArrayLiteralExpression(initializer)) {
      throw new Error(`${stateFile}: ${name} is not an array literal`);
    }
    for (const entry of initializer.getElements()) {
      const pair = Node.isArrayLiteralExpression(entry) ? entry.getElements() : [];
      const [key, attribute] = pair;
      if (!Node.isStringLiteral(key) || !Node.isStringLiteral(attribute)) {
        throw new Error(`${stateFile}: ${name} has an entry that is not ['key', 'data-…']`);
      }
      table.set(key.getLiteralValue(), attribute.getLiteralValue());
    }
  }
  return table;
}

/**
 * Scans a component folder. `components` are the names of the exported component functions of the
 * entry (flat names: `SelectTrigger`, not `Select.Trigger`); `rel` makes paths repo-relative.
 */
export function scanSlots(
  project: Project,
  folder: string,
  components: ReadonlySet<string>,
  stateTable: ReadonlyMap<string, string>,
  rel: (file: string) => string,
): SlotScan {
  const errors: string[] = [];
  const occurrences: SlotOccurrence[] = [];
  const files = readdirSync(folder)
    .filter((file) => /\.tsx?$/.test(file) && !SKIP.test(file) && file !== 'index.ts')
    .toSorted()
    .map((file) => project.addSourceFileAtPath(join(folder, file)));
  for (const file of files) {
    try {
      scanFile(file, components, stateTable, rel, occurrences, errors);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push(`${rel(file.getFilePath())}: ${reason}`);
    }
  }
  return { occurrences, errors };
}

function scanFile(
  file: SourceFile,
  components: ReadonlySet<string>,
  stateTable: ReadonlyMap<string, string>,
  rel: (file: string) => string,
  occurrences: SlotOccurrence[],
  errors: string[],
): void {
  const where = rel(file.getFilePath());
  const functions = topLevelFunctions(file);
  const owners = helperOwners(functions, components);
  const engine = engineNamespace(file);
  const adapters = new Map<string, AdapterPart | undefined>();
  const adapterOf = (part: string): AdapterPart => {
    if (!adapters.has(part)) adapters.set(part, findAdapterPart(file, part));
    const found = adapters.get(part);
    if (found === undefined) throw new Error(`Engine.${part} has no adapter export`);
    return found;
  };
  const roots = new Map<string, Node | undefined>();
  const rootOf = (name: string): Node | undefined => {
    if (!roots.has(name)) {
      const fn = functions.get(name);
      roots.set(name, fn === undefined ? undefined : rootSlotNode(fn));
    }
    return roots.get(name);
  };

  const slotNodes: Node[] = [
    ...file
      .getDescendantsOfKind(SyntaxKind.JsxAttribute)
      .filter((attribute) => attribute.getNameNode().getText() === 'data-slot'),
    ...file
      .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .filter((property) => propertyName(property) === 'data-slot'),
  ];
  for (const node of slotNodes) {
    const slot = slotValue(node);
    if (slot === undefined) {
      errors.push(`${where}: data-slot must be a string literal (${node.getText()})`);
      continue;
    }
    const enclosing = enclosingTopLevel(node, functions);
    if (enclosing === undefined) {
      errors.push(`${where}: data-slot "${slot}" is written outside a component function`);
      continue;
    }
    const renderers = components.has(enclosing) ? [enclosing] : (owners.get(enclosing) ?? []);
    if (renderers.length !== 1) {
      errors.push(
        renderers.length === 0
          ? `${where}: data-slot "${slot}" is written by ${enclosing}, which no exported component renders`
          : `${where}: data-slot "${slot}" is written by ${enclosing}, which ${renderers.join(' and ')} both render`,
      );
      continue;
    }
    const component = renderers[0] ?? '';
    const owner = node.getParentOrThrow();
    const attributes = new Set<string>();
    const classText: string[] = [];
    const element = owner.getKind() === SyntaxKind.JsxAttributes ? owner.getParent() : undefined;
    if (
      element !== undefined &&
      (Node.isJsxOpeningElement(element) || Node.isJsxSelfClosingElement(element))
    ) {
      for (const attribute of element.getAttributes()) {
        if (!Node.isJsxAttribute(attribute)) continue;
        const name = attribute.getNameNode().getText();
        if (name.startsWith('data-')) attributes.add(name);
        if (name === 'className') classText.push(attribute.getInitializer()?.getText() ?? '');
      }
      const part = engine === undefined ? undefined : enginePartOf(element, engine);
      if (part !== undefined) {
        for (const name of adapterOf(part).attributes('rest', [...attributes], stateTable)) {
          attributes.add(name);
        }
      }
    } else if (Node.isObjectLiteralExpression(owner)) {
      for (const name of objectDataNames(owner, stateTable, classText)) attributes.add(name);
      // `positioner={{ … }}` on an engine element: that adapter parameter's channel.
      const container = owner.getParent();
      const attribute = Node.isJsxExpression(container) ? container.getParent() : undefined;
      if (attribute !== undefined && Node.isJsxAttribute(attribute) && engine !== undefined) {
        const engineElement = attribute.getParentOrThrow().getParentOrThrow();
        const part = enginePartOf(engineElement, engine);
        if (part !== undefined) {
          const channel = attribute.getNameNode().getText();
          for (const name of adapterOf(part).attributes(channel, [], stateTable)) {
            attributes.add(name);
          }
        }
      }
    } else {
      errors.push(`${where}: data-slot "${slot}" is on something other than an element or object`);
      continue;
    }
    const classPattern = new RegExp(`(?<![\\w-])nz-${slot}(?![\\w-])`);
    if (!classText.some((value) => classPattern.test(value))) {
      errors.push(
        `${where}: the element with data-slot "${slot}" must have the class nz-${slot} (§8.2)`,
      );
    }
    attributes.delete('data-slot');
    occurrences.push({
      slot,
      component,
      // the component's root, whether written in it or in a same-file builder it returns
      root: rootOf(component) === node,
      attributes: [...attributes].toSorted(),
    });
  }
}

/** The quoted or bare name of an object-literal property. */
function propertyName(node: Node): string | undefined {
  if (!Node.isPropertyAssignment(node) && !Node.isShorthandPropertyAssignment(node)) {
    return undefined;
  }
  const name = node.getNameNode();
  return Node.isStringLiteral(name) ? name.getLiteralValue() : name.getText();
}

function slotValue(node: Node): string | undefined {
  let value: Node | undefined;
  if (Node.isJsxAttribute(node)) {
    value = node.getInitializer();
    if (value !== undefined && Node.isJsxExpression(value)) value = value.getExpression();
  } else if (Node.isPropertyAssignment(node)) {
    value = node.getInitializer();
  }
  if (value === undefined) return undefined;
  if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
    return value.getLiteralValue();
  }
  return undefined;
}

/** `data-*` names of an object literal, `...stateAttrs(…)` spreads included; collects `className`. */
function objectDataNames(
  object: ObjectLiteralExpression,
  stateTable: ReadonlyMap<string, string>,
  classText: string[],
): string[] {
  const names: string[] = [];
  for (const property of object.getProperties()) {
    if (Node.isSpreadAssignment(property)) {
      // `...stateAttrs(s)` adds attributes; any other spread (`...rest`) is the consumer's props
      for (const key of mergedStateKeys(property.getExpression())) {
        names.push(attributeOf(key, stateTable));
      }
      continue;
    }
    const name = propertyName(property);
    if (name === undefined) continue;
    if (name.startsWith('data-')) names.push(name);
    if (name === 'className' && Node.isPropertyAssignment(property)) {
      classText.push(property.getInitializer()?.getText() ?? '');
    }
  }
  return names;
}

function attributeOf(key: string, stateTable: ReadonlyMap<string, string>): string {
  const name = stateTable.get(key);
  if (name === undefined) throw new Error(`stateAttrs() has no key "${key}" (contracts/state.ts)`);
  return name;
}

/** Top-level functions by name: `function X` and `const X = (…) => …`. */
function topLevelFunctions(file: SourceFile): Map<string, FunctionLike> {
  const functions = new Map<string, FunctionLike>();
  for (const fn of file.getFunctions()) {
    const name = fn.getName();
    if (name !== undefined) functions.set(name, fn);
  }
  for (const statement of file.getVariableStatements()) {
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        functions.set(declaration.getName(), initializer);
      }
    }
  }
  return functions;
}

/** The top-level function a node is in. */
function enclosingTopLevel(
  node: Node,
  functions: ReadonlyMap<string, FunctionLike>,
): string | undefined {
  for (const [name, fn] of functions) {
    if (fn.getPos() <= node.getPos() && node.getEnd() <= fn.getEnd()) return name;
  }
  return undefined;
}

/** For each helper function, the exported components that call it, directly or through helpers. */
function helperOwners(
  functions: ReadonlyMap<string, FunctionLike>,
  components: ReadonlySet<string>,
): Map<string, string[]> {
  const references = new Map<string, Set<string>>();
  for (const [name, fn] of functions) {
    const used = new Set(
      fn
        .getDescendantsOfKind(SyntaxKind.Identifier)
        .map((identifier) => identifier.getText())
        .filter((text) => text !== name && functions.has(text)),
    );
    references.set(name, used);
  }
  const owners = new Map<string, string[]>();
  for (const name of functions.keys()) {
    if (components.has(name)) continue;
    const found = new Set<string>();
    const queue = [name];
    const seen = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift() ?? '';
      for (const [caller, used] of references) {
        if (!used.has(current) || seen.has(caller)) continue;
        seen.add(caller);
        if (components.has(caller)) found.add(caller);
        else queue.push(caller);
      }
    }
    owners.set(name, [...found].toSorted());
  }
  return owners;
}

/**
 * The `data-slot` node of the element a component renders as its root, if any. It follows a JSX
 * wrapper's children (a context provider around `{renderElement(…)}`) and a call to a function in
 * the same file that builds the element (`return iconButtonElement(props)`).
 */
function rootSlotNode(fn: FunctionLike, seen: Set<FunctionLike> = new Set()): Node | undefined {
  if (seen.has(fn)) return undefined;
  seen.add(fn);
  const body = fn.getBody();
  const expressions: Node[] = [];
  if (body !== undefined && !Node.isBlock(body)) expressions.push(body);
  for (const statement of fn.getDescendantsOfKind(SyntaxKind.ReturnStatement)) {
    const owner = statement.getFirstAncestor(
      (ancestor) =>
        Node.isFunctionDeclaration(ancestor) ||
        Node.isArrowFunction(ancestor) ||
        Node.isFunctionExpression(ancestor),
    );
    const expression = statement.getExpression();
    if (owner === fn && expression !== undefined) expressions.push(expression);
  }
  for (const expression of expressions) {
    const found = rootIn(expression, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

function rootIn(node: Node, seen: Set<FunctionLike>): Node | undefined {
  if (Node.isParenthesizedExpression(node)) return rootIn(node.getExpression(), seen);
  if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;
    const attribute = opening
      .getAttributes()
      .find(
        (candidate) =>
          Node.isJsxAttribute(candidate) && candidate.getNameNode().getText() === 'data-slot',
      );
    if (attribute !== undefined) return attribute;
    if (Node.isJsxSelfClosingElement(node)) return undefined;
    return firstChildRoot(node.getJsxChildren(), seen);
  }
  if (Node.isJsxFragment(node)) return firstChildRoot(node.getJsxChildren(), seen);
  if (Node.isCallExpression(node)) {
    const callee = node.getExpression().getText();
    if (callee === 'renderElement') {
      const props = node.getArguments()[3];
      if (props !== undefined && Node.isObjectLiteralExpression(props)) {
        return props.getProperties().find((property) => propertyName(property) === 'data-slot');
      }
      return undefined;
    }
    // A same-file builder: its own root is the component's.
    const builder = topLevelFunctions(node.getSourceFile()).get(callee);
    if (builder !== undefined) return rootSlotNode(builder, seen);
  }
  return undefined;
}

function firstChildRoot(children: Node[], seen: Set<FunctionLike>): Node | undefined {
  for (const child of children) {
    const inner = Node.isJsxExpression(child) ? child.getExpression() : child;
    if (
      inner !== undefined &&
      (Node.isJsxElement(inner) ||
        Node.isJsxSelfClosingElement(inner) ||
        Node.isJsxFragment(inner) ||
        Node.isCallExpression(inner))
    ) {
      const found = rootIn(inner, seen);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** The local name of `import * as Engine from './engine'`, if the file has it. */
function engineNamespace(file: SourceFile): { name: string; module: string } | undefined {
  for (const declaration of file.getImportDeclarations()) {
    const namespace = declaration.getNamespaceImport();
    if (namespace !== undefined && declaration.getModuleSpecifierValue() === './engine') {
      return {
        name: namespace.getText(),
        module: resolveSource(dirname(file.getFilePath()), './engine'),
      };
    }
  }
  return undefined;
}

/** `Engine.Trigger` → `Trigger`, for an element whose tag reads the engine namespace. */
function enginePartOf(element: Node, engine: { name: string }): string | undefined {
  if (!Node.isJsxOpeningElement(element) && !Node.isJsxSelfClosingElement(element)) {
    return undefined;
  }
  const tag = element.getTagNameNode();
  if (!Node.isPropertyAccessExpression(tag)) return undefined;
  return tag.getExpression().getText() === engine.name ? tag.getName() : undefined;
}

function resolveSource(from: string, specifier: string): string {
  const base = resolve(from, specifier);
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`cannot resolve ${specifier} from ${from}`);
}

interface AdapterPart {
  /** The attributes the adapter adds to what arrives through `channel` (`rest` for the DOM rest). */
  attributes(channel: string, passed: string[], stateTable: ReadonlyMap<string, string>): string[];
}

/** Follows `engine.ts` (`export { Trigger } from '../_engines/…'`) to the adapter's part. */
function findAdapterPart(leaf: SourceFile, part: string): AdapterPart | undefined {
  const project = leaf.getProject();
  const engineFile = resolveSource(dirname(leaf.getFilePath()), './engine');
  const engine = project.getSourceFile(engineFile) ?? project.addSourceFileAtPath(engineFile);
  for (const declaration of engine.getExportDeclarations()) {
    const specifier = declaration
      .getNamedExports()
      .find((named) => (named.getAliasNode()?.getText() ?? named.getName()) === part);
    const module = declaration.getModuleSpecifierValue();
    if (specifier === undefined || module === undefined) continue;
    const adapterFile = resolveSource(dirname(engineFile), module);
    const adapter = project.getSourceFile(adapterFile) ?? project.addSourceFileAtPath(adapterFile);
    const fn = topLevelFunctions(adapter).get(specifier.getName());
    if (fn === undefined) return undefined;
    if (
      adapter
        .getDescendantsOfKind(SyntaxKind.JsxAttribute)
        .some((attribute) => attribute.getNameNode().getText() === 'data-slot')
    ) {
      throw new Error(
        `${basename(adapterFile)} names an element: adapters write no data-slot (§9.2)`,
      );
    }
    return adapterPart(fn);
  }
  return undefined;
}

function adapterPart(fn: FunctionLike): AdapterPart {
  const [parameter] = fn.getParameters();
  const pattern = parameter?.getNameNode();
  const bindings = new Map<string, string>();
  let rest: string | undefined;
  if (pattern !== undefined && Node.isObjectBindingPattern(pattern)) {
    for (const element of pattern.getElements()) {
      if (element.getDotDotDotToken() !== undefined) {
        rest = element.getName();
        continue;
      }
      const property = element.getPropertyNameNode();
      const name =
        property === undefined
          ? element.getName()
          : Node.isStringLiteral(property)
            ? property.getLiteralValue()
            : property.getText();
      bindings.set(name, element.getName());
    }
  }
  return {
    attributes(channel, passed, stateTable) {
      for (const name of passed) {
        if (bindings.has(name)) {
          throw new Error(`the adapter takes ${name} apart; nz api cannot tell where it goes`);
        }
      }
      const binding = channel === 'rest' ? rest : bindings.get(channel);
      if (binding === undefined) return [];
      const names = new Set<string>();
      for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        if (call.getExpression().getText() !== 'mergeProps') continue;
        const args = call.getArguments();
        if (!args.some((arg) => Node.isIdentifier(arg) && arg.getText() === binding)) continue;
        for (const arg of args) {
          for (const key of mergedStateKeys(arg)) names.add(attributeOf(key, stateTable));
        }
      }
      return [...names];
    },
  };
}

/** The state keys of a `mergeProps` argument that is `stateAttrs(…)` or a name bound to one. */
function mergedStateKeys(arg: Node): string[] {
  if (isStateAttrsCall(arg)) return stateKeys(arg.getArguments()[0]);
  if (Node.isIdentifier(arg)) {
    const initializer = lookupLocal(arg)?.getInitializer();
    if (initializer !== undefined && isStateAttrsCall(initializer)) {
      return stateKeys(initializer.getArguments()[0]);
    }
  }
  return [];
}

function isStateAttrsCall(node: Node): node is CallExpression {
  return Node.isCallExpression(node) && node.getExpression().getText() === 'stateAttrs';
}

/** The keys of the object given to `stateAttrs`, following spreads and local names. */
function stateKeys(node: Node | undefined): string[] {
  if (node === undefined) throw new Error('stateAttrs() without an argument');
  if (isStateAttrsCall(node)) return stateKeys(node.getArguments()[0]);
  if (
    Node.isParenthesizedExpression(node) ||
    Node.isAsExpression(node) ||
    Node.isSatisfiesExpression(node)
  ) {
    return stateKeys(node.getExpression());
  }
  if (Node.isObjectLiteralExpression(node)) {
    return node.getProperties().flatMap((property) => {
      if (Node.isSpreadAssignment(property)) return stateKeys(property.getExpression());
      const name = propertyName(property);
      if (name === undefined) throw new Error(`cannot read a key of ${property.getText()}`);
      return [name];
    });
  }
  if (Node.isIdentifier(node)) {
    const initializer = lookupLocal(node)?.getInitializer();
    if (initializer !== undefined) return stateKeys(initializer);
  }
  throw new Error(`cannot read the state keys of ${node.getText()}`);
}

/** The variable declaration a name refers to, by lexical scope, within its file. */
function lookupLocal(identifier: Node): VariableDeclaration | undefined {
  const name = identifier.getText();
  for (let node = identifier.getParent(); node !== undefined; node = node.getParent()) {
    if (Node.isBlock(node) || Node.isSourceFile(node)) {
      for (const statement of node.getStatements()) {
        if (!Node.isVariableStatement(statement)) continue;
        const found = statement.getDeclarations().find((d) => d.getName() === name);
        if (found !== undefined) return found;
      }
    }
    if (
      (Node.isArrowFunction(node) ||
        Node.isFunctionDeclaration(node) ||
        Node.isFunctionExpression(node)) &&
      node.getParameters().some((parameter) => parameter.getName() === name)
    ) {
      return undefined;
    }
  }
  return undefined;
}
