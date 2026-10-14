/**
 * `contracts/api/react/<entry>.json` from the built `@nizivo/react` (ARCHITECTURE.md §6, §18.1,
 * §18.2; field reference in API-JSON.md).
 *
 * - Exports, props, types and JSDoc: the public `.d.ts` files under `dist`, one entry per JavaScript
 *   key of the exports map, read with ts-morph 28 (its bundled TypeScript 6.0.2). Type text is what
 *   tsdown printed. Each entry's export names are compared with its `src` barrel first, so a stale
 *   `dist` fails instead of producing a stale contract.
 * - `client`: the built `.js` next to the declaring `.d.ts` (`.d.ts` files drop directives).
 * - `component`, part order and `variants`: `src/<name>/component.json`.
 * - Slots and their attributes: `slots.ts`, from the source; attribute groups, values and meanings
 *   from `contracts/vocabulary.json` and the manifest's `variants` (§8.3 rule 5).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  type ExpressionWithTypeArguments,
  type FunctionDeclaration,
  type InterfaceDeclaration,
  type MethodSignature,
  type ModuleDeclaration,
  Node,
  Project,
  type PropertySignature,
  type SourceFile,
  SyntaxKind,
  ts,
  type TypeElementTypes,
  type TypeNode,
  type TypeReferenceNode,
} from 'ts-morph';
import { type ComponentConfig, focusTargetOf, kebabCase, pascalCase } from '../gen/schema.ts';
import type { Vocabulary } from '../stylelint-config/contract.js';
import type {
  ApiExport,
  ApiExportKind,
  ComponentDoc,
  ComponentInfo,
  DataAttributeDoc,
  ExportBase,
  InheritedProps,
  LiteralValue,
  MemberDoc,
  ParameterDoc,
  PartDoc,
  ReactApiFile,
  RenderDoc,
  SignatureDoc,
  SlotInfo,
  TypeExport,
} from './schema.ts';
import { readStateTable, scanSlots, type SlotOccurrence } from './slots.ts';
import { compareStrings, type DocComment, GENERATED_COMMENT, parseDocComment } from './text.ts';

export interface ReactInput {
  /** The repo root: output paths are relative to it. */
  root: string;
  /** `packages/react`. */
  reactDir: string;
  /** The `exports` field of `packages/react/package.json`. */
  exportsMap: Readonly<Record<string, unknown>>;
  /** Validated manifests by folder under `src` (`alert`, `unstable/date-picker`). */
  manifests: ReadonlyMap<string, ComponentConfig>;
  vocabulary: Vocabulary;
  /** The vocabulary's `meaning` of each attribute. */
  meanings: ReadonlyMap<string, string>;
}

export interface ReactResult {
  /** `react/alert.json` → its content, for every JavaScript entry. */
  files: Map<string, ReactApiFile>;
  errors: string[];
}

interface Entry {
  /** The exports key: `.`, `./alert`. */
  key: string;
  /** `react/alert.json`. */
  output: string;
  /** The import specifier: `@nizivo/react/alert`. */
  specifier: string;
  /** The entry's `.d.ts`. */
  types: string;
  /** The `src` file whose exports must match: the barrel, or `src/augment.ts`. */
  source: string;
  /** The folder under `dist` and `src` for a folder entry (`alert`); undefined for a file entry. */
  folder: string | undefined;
  manifest: ComponentConfig | undefined;
}

interface Owned {
  kind: ApiExportKind;
  doc: ApiExport;
}

/** A React DOM props base, `ComponentPropsWithRef<"div">`: its intrinsic element. */
const ELEMENT_PROPS =
  /^(?:React\.)?ComponentProps(?:WithRef|WithoutRef)?<(["'])([a-z][a-z0-9]*)\1>$/;
const NO_STATE = 'Record<string, never>';
const USE_CLIENT = /^\s*(["'])use client\1/;

export function extractReact(input: ReactInput): ReactResult {
  const errors: string[] = [];
  const files = new Map<string, ReactApiFile>();
  const distDir = join(input.reactDir, 'dist');
  const srcDir = join(input.reactDir, 'src');
  const rel = (file: string) => relative(input.root, file).split(sep).join('/');

  const entries = readEntries(input, distDir, srcDir, errors);
  if (errors.length > 0) return { files, errors };

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: [],
    },
  });
  for (const entry of entries) project.addSourceFileAtPath(entry.types);
  project.resolveSourceFileDependencies();
  // Source is only parsed: no checker, no module resolution.
  const sourceProject = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { noLib: true, jsx: ts.JsxEmit.Preserve },
  });

  const exported = new Map<string, ReadonlyMap<string, Node[]>>();
  for (const entry of entries) {
    const file = project.getSourceFileOrThrow(entry.types);
    const declarations = file.getExportedDeclarations();
    exported.set(entry.key, declarations);
    const expected = sourceExportNames(sourceProject.addSourceFileAtPath(entry.source));
    const built = [...declarations.keys()];
    const missing = [...expected].filter((name) => !declarations.has(name));
    const extra = built.filter((name) => !expected.has(name));
    if (missing.length > 0 || extra.length > 0) {
      errors.push(
        `${rel(entry.types)}: its exports differ from ${rel(entry.source)}` +
          (missing.length > 0 ? `; missing ${missing.toSorted().join(', ')}` : '') +
          (extra.length > 0 ? `; extra ${extra.toSorted().join(', ')}` : '') +
          ' (rebuild @nizivo/react)',
      );
    }
  }
  if (errors.length > 0) return { files, errors };

  const homeOf = (file: SourceFile): Entry | undefined => {
    const path = relative(distDir, file.getFilePath()).split(sep).join('/');
    let best: Entry | undefined;
    for (const entry of entries) {
      if (entry.key === '.') continue;
      if (entry.folder === undefined) {
        if (relative(distDir, entry.types).split(sep).join('/') === path) return entry;
      } else if (
        path.startsWith(`${entry.folder}/`) &&
        (best?.folder === undefined || entry.folder.length > best.folder.length)
      ) {
        best = entry;
      }
    }
    return best;
  };

  const context = new Context(input, sourceProject, distDir, srcDir, rel, errors);
  const owned = new Map<string, Map<string, Owned>>();
  for (const entry of entries) {
    const declarations = exported.get(entry.key) ?? new Map<string, Node[]>();
    const own = new Map<string, Node[]>();
    for (const [name, nodes] of declarations) {
      const home = nodes[0] === undefined ? undefined : homeOf(nodes[0].getSourceFile());
      if (home === undefined) {
        errors.push(`${rel(entry.types)}: ${name} is declared outside every public entry`);
      } else if (home.key === entry.key || !exported.get(home.key)?.has(name)) {
        own.set(name, nodes);
      }
    }
    try {
      owned.set(entry.key, context.documentEntry(entry, own));
    } catch (error) {
      errors.push(`${rel(entry.types)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (errors.length > 0) return { files, errors };

  for (const entry of entries) {
    const declarations = exported.get(entry.key) ?? new Map<string, Node[]>();
    const docs = owned.get(entry.key) ?? new Map<string, Owned>();
    const exports: ApiExport[] = [];
    for (const [name, nodes] of declarations) {
      const doc = docs.get(name)?.doc;
      if (doc !== undefined) {
        exports.push(doc);
        continue;
      }
      const home = nodes[0] === undefined ? undefined : homeOf(nodes[0].getSourceFile());
      const homeDoc = home === undefined ? undefined : owned.get(home.key)?.get(name);
      if (home === undefined || homeDoc === undefined) {
        errors.push(`${rel(entry.types)}: ${name} is documented nowhere`);
        continue;
      }
      exports.push({
        definedIn: home.key,
        import: importLine(name, homeDoc.kind, entry.specifier),
        kind: homeDoc.kind,
        name,
      });
    }
    files.set(entry.output, {
      $comment: GENERATED_COMMENT,
      ...(entry.manifest === undefined ? {} : { component: componentInfo(entry.manifest, input) }),
      entry: entry.key,
      exports: exports.toSorted((a, b) => compareStrings(a.name, b.name)),
      package: '@nizivo/react',
      slots: context.slotsOf(entry.key),
      version: 1,
    });
  }
  return { files, errors };
}

function readEntries(
  input: ReactInput,
  distDir: string,
  srcDir: string,
  errors: string[],
): Entry[] {
  const entries: Entry[] = [];
  for (const [key, target] of Object.entries(input.exportsMap)) {
    if (typeof target !== 'object' || target === null || !('types' in target)) continue;
    if (typeof target.types !== 'string') continue;
    const types = join(input.reactDir, target.types);
    if (!existsSync(types)) {
      errors.push(`packages/react: ${target.types} is missing; build @nizivo/react first`);
      continue;
    }
    const distPath = relative(distDir, types).split(sep).join('/');
    const folder = distPath.endsWith('/index.d.ts')
      ? distPath.slice(0, -'/index.d.ts'.length)
      : undefined;
    const name = key === '.' ? 'index' : key.slice('./'.length);
    entries.push({
      key,
      output: `react/${name}.json`,
      specifier: key === '.' ? '@nizivo/react' : `@nizivo/react/${name}`,
      types,
      source:
        folder === undefined
          ? join(srcDir, distPath.replace(/\.d\.ts$/, '.ts'))
          : join(srcDir, folder, 'index.ts'),
      folder,
      manifest: folder === undefined ? undefined : input.manifests.get(folder),
    });
  }
  return entries;
}

/** The names a source module exports, read from its syntax. */
function sourceExportNames(file: SourceFile): Set<string> {
  const names = new Set<string>();
  for (const declaration of file.getExportDeclarations()) {
    const namespace = declaration.getNamespaceExport();
    if (namespace !== undefined) names.add(namespace.getName());
    for (const named of declaration.getNamedExports()) {
      names.add(named.getAliasNode()?.getText() ?? named.getName());
    }
  }
  for (const statement of file.getStatements()) {
    if (!Node.isExportable(statement) || !statement.isExported()) continue;
    if (Node.isVariableStatement(statement)) {
      for (const declaration of statement.getDeclarations()) names.add(declaration.getName());
    } else if (
      Node.isFunctionDeclaration(statement) ||
      Node.isInterfaceDeclaration(statement) ||
      Node.isTypeAliasDeclaration(statement) ||
      Node.isClassDeclaration(statement) ||
      Node.isEnumDeclaration(statement)
    ) {
      const name = statement.getName();
      if (name !== undefined) names.add(name);
    }
  }
  return names;
}

function importLine(name: string, kind: ApiExportKind, specifier: string): string {
  return `import ${kind === 'type' ? 'type ' : ''}{ ${name} } from '${specifier}'`;
}

function componentInfo(manifest: ComponentConfig, input: ReactInput): ComponentInfo {
  const stylesheet = `./css/${manifest.name}.css`;
  return {
    cssDeps: [...(manifest.cssDeps ?? [])].toSorted(compareStrings),
    ...(manifest.engine === undefined ? {} : { engine: manifest.engine }),
    name: manifest.name,
    ...(manifest.overlay === true ? { overlay: true } : {}),
    status: manifest.status,
    ...(stylesheet in input.exportsMap ? { stylesheet } : {}),
    tier: manifest.tier,
    variants: Object.fromEntries(
      Object.entries(manifest.variants ?? {}).map(([prop, values]) => [prop, [...values]]),
    ),
  };
}

/** `data-span-sm` → `spanSm`: the manifest `variants` key and the prop name it would mirror. */
function camelOf(attribute: string): string {
  return attribute
    .slice('data-'.length)
    .replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function docOf(node: Node): DocComment {
  const target = Node.isVariableDeclaration(node) ? node.getVariableStatement() : node;
  if (target !== undefined && Node.isJSDocable(target)) {
    const last = target.getJsDocs().at(-1);
    if (last !== undefined) return parseDocComment(last.getText());
  }
  return { params: new Map() };
}

function described(doc: DocComment): Pick<ExportBase, 'description' | 'deprecated'> {
  return {
    ...(doc.description === undefined ? {} : { description: doc.description }),
    ...(doc.deprecated === undefined ? {} : { deprecated: doc.deprecated }),
  };
}

/** The declaration a type or value name refers to, through import aliases. */
function declarationOf(name: Node): Node | undefined {
  let symbol = name.getSymbol();
  if (symbol?.isAlias() === true) symbol = symbol.getAliasedSymbol();
  return symbol?.getDeclarations()[0];
}

function memberName(member: PropertySignature | MethodSignature): string {
  const name = member.getNameNode();
  return Node.isStringLiteral(name) ? name.getLiteralValue() : name.getText();
}

/** A type node as written; on an optional member, a trailing `| undefined` is dropped. */
function typeText(node: TypeNode, optional: boolean): string {
  if (optional && Node.isUnionTypeNode(node)) {
    const members = node.getTypeNodes();
    if (members.length > 1 && members.at(-1)?.getKind() === SyntaxKind.UndefinedKeyword) {
      return members
        .slice(0, -1)
        .map((member) => member.getText())
        .join(' | ');
    }
  }
  return node.getText();
}

const unparen = (node: TypeNode): TypeNode =>
  Node.isParenthesizedTypeNode(node) ? unparen(node.getTypeNode()) : node;

/**
 * The literal members of a type, in the order the declaration that defines the union writes them
 * (never the checker's union order); undefined unless every member is a literal. `undefined` is
 * dropped; `boolean` alone is not a literal union.
 */
export function literalValues(node: TypeNode, seen = new Set<Node>()): LiteralValue[] | undefined {
  if (seen.has(node)) return undefined;
  seen.add(node);
  const values = literalMembers(unparen(node), seen);
  if (values === undefined || values.length === 0) return undefined;
  return values.filter((value, index) => values.indexOf(value) === index);
}

function literalMembers(node: TypeNode, seen: Set<Node>): LiteralValue[] | undefined {
  if (Node.isLiteralTypeNode(node)) {
    const literal = node.getLiteral();
    if (Node.isStringLiteral(literal) || Node.isNoSubstitutionTemplateLiteral(literal)) {
      return [literal.getLiteralValue()];
    }
    if (Node.isNumericLiteral(literal)) return [literal.getLiteralValue()];
    if (literal.getKind() === SyntaxKind.TrueKeyword) return [true];
    if (literal.getKind() === SyntaxKind.FalseKeyword) return [false];
    if (literal.getKind() === SyntaxKind.NullKeyword) return [null];
    if (
      Node.isPrefixUnaryExpression(literal) &&
      literal.getOperatorToken() === SyntaxKind.MinusToken
    ) {
      const operand = literal.getOperand();
      if (Node.isNumericLiteral(operand)) return [-operand.getLiteralValue()];
    }
    return undefined;
  }
  if (Node.isUnionTypeNode(node)) {
    const values: LiteralValue[] = [];
    for (const member of node.getTypeNodes()) {
      if (member.getKind() === SyntaxKind.UndefinedKeyword) continue;
      const found = literalValues(member, seen);
      if (found === undefined) return undefined;
      values.push(...found);
    }
    return values;
  }
  if (Node.isTypeReference(node)) {
    if (node.getTypeArguments().length > 0) return undefined;
    const declaration = declarationOf(node.getTypeName());
    if (
      declaration !== undefined &&
      Node.isTypeAliasDeclaration(declaration) &&
      declaration.getTypeParameters().length === 0
    ) {
      return literalValues(declaration.getTypeNodeOrThrow(), seen);
    }
    return undefined;
  }
  if (Node.isTypeOperatorTypeNode(node) && node.getOperator() === SyntaxKind.KeyOfKeyword) {
    const target = unparen(node.getTypeNode());
    if (!Node.isTypeReference(target)) return undefined;
    const declaration = declarationOf(target.getTypeName());
    if (declaration === undefined || !Node.isInterfaceDeclaration(declaration)) return undefined;
    return declaration.getProperties().map((property) => memberName(property));
  }
  if (Node.isIndexedAccessTypeNode(node)) {
    const object = unparen(node.getObjectTypeNode());
    const index = unparen(node.getIndexTypeNode());
    if (index.getKind() === SyntaxKind.NumberKeyword && Node.isTypeQuery(object)) {
      const declaration = declarationOf(object.getExprName());
      if (declaration === undefined || !Node.isVariableDeclaration(declaration)) return undefined;
      let tuple = declaration.getTypeNode();
      if (
        tuple !== undefined &&
        Node.isTypeOperatorTypeNode(tuple) &&
        tuple.getOperator() === SyntaxKind.ReadonlyKeyword
      ) {
        tuple = tuple.getTypeNode();
      }
      if (tuple === undefined || !Node.isTupleTypeNode(tuple)) return undefined;
      const values: LiteralValue[] = [];
      for (const element of tuple.getElements()) {
        const found = literalValues(element, seen);
        if (found === undefined) return undefined;
        values.push(...found);
      }
      return values;
    }
    if (Node.isLiteralTypeNode(index) && Node.isTypeReference(object)) {
      const key = index.getLiteral();
      const declaration = declarationOf(object.getTypeName());
      if (!Node.isStringLiteral(key) || declaration === undefined) return undefined;
      if (!Node.isInterfaceDeclaration(declaration)) return undefined;
      const member = declaration.getProperty(key.getLiteralValue());
      const type = member?.getTypeNode();
      return type === undefined ? undefined : literalValues(type, seen);
    }
  }
  return undefined;
}

class Context {
  readonly #input: ReactInput;
  readonly #sourceProject: Project;
  readonly #distDir: string;
  readonly #srcDir: string;
  readonly #rel: (file: string) => string;
  readonly #errors: string[];
  readonly #slots = new Map<string, SlotInfo[]>();
  #stateTable: Map<string, string> | undefined;

  constructor(
    input: ReactInput,
    sourceProject: Project,
    distDir: string,
    srcDir: string,
    rel: (file: string) => string,
    errors: string[],
  ) {
    this.#input = input;
    this.#sourceProject = sourceProject;
    this.#distDir = distDir;
    this.#srcDir = srcDir;
    this.#rel = rel;
    this.#errors = errors;
  }

  slotsOf(key: string): SlotInfo[] {
    return this.#slots.get(key) ?? [];
  }

  /** Documents the exports an entry owns, by name. */
  documentEntry(entry: Entry, own: ReadonlyMap<string, Node[]>): Map<string, Owned> {
    const manifest = entry.manifest;
    const pascal = manifest === undefined ? '' : pascalCase(manifest.name);
    /** Flat part name → member name: `CardRoot` → `Root`. */
    const parts = new Map((manifest?.parts ?? []).map((part) => [`${pascal}${part}`, part]));
    const kinds = new Map<string, ApiExportKind>();
    for (const [name, nodes] of own) kinds.set(name, this.#kindOf(name, nodes, parts));

    // Components and parts first: their props and state types point back at them.
    const components = new Map<string, { label: string; fn: FunctionDeclaration }>();
    for (const [name, kind] of kinds) {
      if (kind !== 'component' && kind !== 'part') continue;
      const fn = own.get(name)?.find((node) => Node.isFunctionDeclaration(node));
      if (fn === undefined || !Node.isFunctionDeclaration(fn)) continue;
      const part = parts.get(name);
      components.set(name, { label: part === undefined ? name : `${pascal}.${part}`, fn });
    }
    const componentDocs = new Map<string, ComponentDoc>();
    const propsDecls = new Map<string, InterfaceDeclaration>();
    for (const [name, { fn }] of components) {
      const { doc, props } = this.#componentDoc(fn);
      componentDocs.set(name, doc);
      propsDecls.set(name, props);
    }
    if (manifest !== undefined && entry.folder !== undefined) {
      const slots = this.#slotsFor(entry, manifest, components, componentDocs, propsDecls);
      this.#slots.set(entry.key, slots);
    }
    const propsOf = new Map<string, string>();
    const stateOf = new Map<string, string>();
    for (const [name, doc] of [...componentDocs].toSorted(([a], [b]) => compareStrings(a, b))) {
      const label = components.get(name)?.label ?? name;
      if (!propsOf.has(doc.propsType)) propsOf.set(doc.propsType, label);
      const state = doc.render?.stateType;
      if (state !== undefined && !stateOf.has(state)) stateOf.set(state, label);
    }

    const owned = new Map<string, Owned>();
    for (const [name, nodes] of own) {
      const kind = kinds.get(name) ?? 'type';
      const first = nodes[0];
      if (first === undefined) continue;
      const base = { import: importLine(name, kind, entry.specifier), name };
      let doc: ApiExport;
      if (kind === 'component') {
        doc = {
          ...base,
          ...described(docOf(first)),
          ...(componentDocs.get(name) ?? this.#fail(`${name} has no props`)),
          kind,
        };
      } else if (kind === 'part') {
        doc = { ...base, kind, partOf: components.get(name)?.label ?? name };
      } else if (kind === 'namespace') {
        if (!Node.isModuleDeclaration(first) || manifest === undefined) {
          throw new Error(`${name} is a namespace without a manifest`);
        }
        doc = {
          ...base,
          kind,
          parts: this.#namespaceParts(name, first, manifest, pascal, componentDocs, own),
        };
      } else if (kind === 'function' || kind === 'hook') {
        doc = {
          ...base,
          ...described(docOf(first)),
          client: this.#client(first),
          kind,
          signatures: nodes.filter(Node.isFunctionDeclaration).map((fn) => this.#signature(fn)),
          source: this.#source(first),
        };
      } else if (kind === 'constant') {
        if (!Node.isVariableDeclaration(first)) throw new Error(`${name} is not a variable`);
        doc = {
          ...base,
          ...described(docOf(first)),
          client: this.#client(first),
          kind,
          type: first.getTypeNode()?.getText() ?? this.#fail(`${name} has no declared type`),
          source: this.#source(first),
        };
      } else {
        doc = this.#typeExport(name, first, base, propsOf, stateOf);
      }
      owned.set(name, { kind, doc });
    }
    return owned;
  }

  #fail(message: string): never {
    throw new Error(message);
  }

  #kindOf(name: string, nodes: Node[], parts: ReadonlyMap<string, string>): ApiExportKind {
    const kinds = new Set(nodes.map((node) => node.getKind()));
    if (kinds.size !== 1) throw new Error(`${name} has declarations of different kinds`);
    const node = nodes[0];
    if (node === undefined) throw new Error(`${name} has no declaration`);
    if (Node.isModuleDeclaration(node)) return 'namespace';
    if (Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node)) return 'type';
    if (Node.isVariableDeclaration(node)) return 'constant';
    if (Node.isFunctionDeclaration(node)) {
      if (parts.has(name)) return 'part';
      if (/^use[A-Z0-9]/.test(name)) return 'hook';
      return /^[A-Z]/.test(name) ? 'component' : 'function';
    }
    throw new Error(`${name} is a ${node.getKindName()}, which contracts/api cannot describe`);
  }

  /** The repo-relative source of a declaration in `dist`: `.tsx`, else `.ts`. */
  #source(node: Node): string {
    const file = node.getSourceFile().getFilePath();
    const path = relative(this.#distDir, file).replace(/\.d\.ts$/, '');
    for (const extension of ['.tsx', '.ts']) {
      const candidate = join(this.#srcDir, `${path}${extension}`);
      if (existsSync(candidate)) return this.#rel(candidate);
    }
    throw new Error(`${this.#rel(file)} has no source under src`);
  }

  /** Whether the built `.js` of a declaration's module starts with `'use client'`. */
  #client(node: Node): boolean {
    const file = node
      .getSourceFile()
      .getFilePath()
      .replace(/\.d\.ts$/, '.js');
    if (!existsSync(file)) throw new Error(`${this.#rel(file)} is missing: build @nizivo/react`);
    return USE_CLIENT.test(readFileSync(file, 'utf8'));
  }

  #memberDoc(member: TypeElementTypes, inheritedFrom?: string): MemberDoc {
    if (!Node.isPropertySignature(member) && !Node.isMethodSignature(member)) {
      throw new Error(
        `"${member.getText()}" is not a property or method; describe it in schema.ts`,
      );
    }
    const optional = member.hasQuestionToken();
    let type: string;
    let values: LiteralValue[] | undefined;
    if (Node.isPropertySignature(member)) {
      const node = member.getTypeNode();
      if (node === undefined) throw new Error(`${memberName(member)} has no declared type`);
      type = typeText(node, optional);
      values = literalValues(node);
    } else {
      const parameters = member
        .getParameters()
        .map((parameter) => parameter.getText())
        .join(', ');
      type = `(${parameters}) => ${member.getReturnTypeNode()?.getText() ?? 'void'}`;
    }
    const doc = docOf(member);
    return {
      ...(doc.default === undefined ? {} : { default: doc.default }),
      ...described(doc),
      ...(inheritedFrom === undefined ? {} : { inheritedFrom }),
      name: memberName(member),
      required: !optional,
      type,
      ...(values === undefined ? {} : { values }),
    };
  }

  #ownMembers(declaration: InterfaceDeclaration): MemberDoc[] {
    return declaration
      .getMembers()
      .map((member) => this.#memberDoc(member))
      .toSorted((a, b) => compareStrings(a.name, b.name));
  }

  /**
   * The props of an interface: its own members, the members of bases declared in `@nizivo/react`
   * (with `inheritedFrom`), and one summary per React DOM base.
   */
  #props(declaration: InterfaceDeclaration): { props: MemberDoc[]; inherits: InheritedProps[] } {
    const own = declaration.getMembers().map((member) => this.#memberDoc(member));
    const ownNames = new Set(own.map((member) => member.name));
    const props = [...own];
    const inherits: InheritedProps[] = [];
    for (const heritage of declaration.getExtends()) {
      const { inner, omitted } = unwrapBase(heritage);
      const name = Node.isExpressionWithTypeArguments(inner)
        ? inner.getExpression()
        : inner.getTypeName();
      const base = declarationOf(name);
      if (base === undefined) throw new Error(`cannot resolve the base ${inner.getText()}`);
      if (this.#inDist(base)) {
        if (!Node.isInterfaceDeclaration(base)) {
          throw new Error(`the base ${inner.getText()} is not an interface`);
        }
        const inherited = this.#props(base);
        const listed = new Set(inherited.props.map((member) => member.name));
        for (const member of inherited.props) {
          if (ownNames.has(member.name) || omitted.includes(member.name)) continue;
          props.push({ ...member, inheritedFrom: member.inheritedFrom ?? base.getName() });
        }
        for (const summary of inherited.inherits) {
          const removed = omitted.filter((key) => !listed.has(key));
          inherits.push({
            ...summary,
            omitted: [...new Set([...summary.omitted, ...removed])].toSorted(compareStrings),
          });
        }
        continue;
      }
      const type = heritage.getType();
      const baseText = inner.getText();
      const element = ELEMENT_PROPS.exec(baseText)?.[2];
      inherits.push({
        base: baseText,
        ...(element === undefined ? {} : { element }),
        omitted: omitted.toSorted(compareStrings),
        overridden: [...ownNames]
          .filter((member) => type.getProperty(member) !== undefined)
          .toSorted(compareStrings),
        text: heritage.getText(),
      });
    }
    return { props: props.toSorted((a, b) => compareStrings(a.name, b.name)), inherits };
  }

  #inDist(node: Node): boolean {
    const path = relative(this.#distDir, node.getSourceFile().getFilePath());
    return !path.startsWith('..') && !path.includes('node_modules');
  }

  #componentDoc(fn: FunctionDeclaration): { doc: ComponentDoc; props: InterfaceDeclaration } {
    const name = fn.getName() ?? '';
    const parameter = fn.getParameters()[0];
    const typeNode = parameter?.getTypeNode();
    if (typeNode === undefined || !Node.isTypeReference(typeNode)) {
      throw new Error(`${name}'s first parameter must be typed with its props interface`);
    }
    const declaration = declarationOf(typeNode.getTypeName());
    if (declaration === undefined || !Node.isInterfaceDeclaration(declaration)) {
      throw new Error(`${name}'s props type ${typeNode.getText()} is not an interface`);
    }
    const { props, inherits } = this.#props(declaration);
    const render = this.#render(props, declaration, name);
    return {
      doc: {
        client: this.#client(fn),
        inherits,
        props,
        propsType: typeNode.getText(),
        ...(render === undefined ? {} : { render }),
        source: this.#source(fn),
      },
      props: declaration,
    };
  }

  /** The `render` prop's state: `S` in `RenderProp<S>`. */
  #render(
    props: MemberDoc[],
    declaration: InterfaceDeclaration,
    name: string,
  ): RenderDoc | undefined {
    if (!props.some((member) => member.name === 'render')) return undefined;
    const member = findMember(declaration, 'render');
    let node = member?.getTypeNode();
    if (node !== undefined && Node.isUnionTypeNode(node)) {
      const [first, ...rest] = node.getTypeNodes();
      if (rest.every((item) => item.getKind() === SyntaxKind.UndefinedKeyword)) node = first;
    }
    if (
      node === undefined ||
      !Node.isTypeReference(node) ||
      node.getTypeName().getText() !== 'RenderProp'
    ) {
      throw new Error(`${name}'s render prop must be typed RenderProp<State>`);
    }
    const state = node.getTypeArguments()[0];
    if (state === undefined) throw new Error(`${name}'s RenderProp has no state type`);
    const resolved = resolveAlias(state);
    if (resolved.getText() === NO_STATE) return { state: [] };
    if (Node.isTypeReference(resolved)) {
      const target = declarationOf(resolved.getTypeName());
      if (target !== undefined && Node.isInterfaceDeclaration(target)) {
        return { state: this.#ownMembers(target), stateType: state.getText() };
      }
    }
    throw new Error(`${name}'s render state ${state.getText()} is not an interface`);
  }

  #namespaceParts(
    name: string,
    namespace: ModuleDeclaration,
    manifest: ComponentConfig,
    pascal: string,
    componentDocs: ReadonlyMap<string, ComponentDoc>,
    own: ReadonlyMap<string, Node[]>,
  ): PartDoc[] {
    const members = new Map<string, string>();
    for (const declaration of namespace.getDescendantsOfKind(SyntaxKind.ExportSpecifier)) {
      members.set(
        declaration.getAliasNode()?.getText() ?? declaration.getName(),
        declaration.getName(),
      );
    }
    const expected = manifest.parts ?? [];
    const unexpected = [...members.keys()].filter((member) => !expected.includes(member));
    if (unexpected.length > 0) {
      throw new Error(`${name} has members outside the manifest parts: ${unexpected.join(', ')}`);
    }
    const parts: PartDoc[] = [];
    for (const part of expected) {
      const flatName = `${pascal}${part}`;
      if (members.get(part) !== flatName) {
        throw new Error(`${name}.${part} must be ${flatName}`);
      }
      const doc = componentDocs.get(flatName);
      const node = own.get(flatName)?.[0];
      if (doc === undefined || node === undefined) {
        throw new Error(`${name}.${part}: ${flatName} is not exported by this entry`);
      }
      parts.push({ ...doc, ...described(docOf(node)), flatName, name: part });
    }
    return parts;
  }

  #signature(fn: FunctionDeclaration): SignatureDoc {
    const doc = docOf(fn);
    const parameters: ParameterDoc[] = [];
    for (const parameter of fn.getParameters()) {
      const name = parameter.getName();
      const entry: ParameterDoc = {
        name,
        optional: parameter.hasQuestionToken(),
        type: parameter.getTypeNode()?.getText() ?? 'unknown',
      };
      const description = doc.params.get(name);
      if (description !== undefined) entry.description = description;
      if (parameter.isRestParameter()) entry.rest = true;
      parameters.push(entry);
    }
    const text = fn
      .getText()
      .replace(/^export\s+/, '')
      .replace(/^declare\s+/, '')
      .replace(/;$/, '');
    return {
      parameters,
      returns: {
        ...(doc.returns === undefined ? {} : { description: doc.returns }),
        type: fn.getReturnTypeNode()?.getText() ?? 'void',
      },
      text,
    };
  }

  #typeExport(
    name: string,
    node: Node,
    base: { import: string; name: string },
    propsOf: ReadonlyMap<string, string>,
    stateOf: ReadonlyMap<string, string>,
  ): TypeExport {
    const common = {
      ...base,
      ...described(docOf(node)),
      kind: 'type' as const,
      source: this.#source(node),
    };
    if (Node.isInterfaceDeclaration(node)) {
      const heritage = node.getExtends().map((clause) => clause.getText());
      const owner = propsOf.get(name);
      const state = stateOf.get(name);
      return {
        ...common,
        declaration: 'interface',
        ...(heritage.length === 0 ? {} : { extends: heritage }),
        ...(owner === undefined && state === undefined ? { members: this.#ownMembers(node) } : {}),
        ...(owner === undefined ? {} : { propsOf: owner }),
        ...(state === undefined ? {} : { stateOf: state }),
        typeParameters: node.getTypeParameters().map((parameter) => parameter.getText()),
      };
    }
    if (Node.isTypeAliasDeclaration(node)) {
      const typeNode = node.getTypeNodeOrThrow();
      const parameters = node.getTypeParameters().map((parameter) => parameter.getText());
      const values = parameters.length === 0 ? literalValues(typeNode) : undefined;
      const state = stateOf.get(name);
      return {
        ...common,
        declaration: 'type',
        ...(state === undefined ? {} : { stateOf: state }),
        text: typeNode.getText(),
        typeParameters: parameters,
        ...(values === undefined ? {} : { values }),
      };
    }
    throw new Error(`${name} is not an interface or a type alias`);
  }

  #slotsFor(
    entry: Entry,
    manifest: ComponentConfig,
    components: ReadonlyMap<string, { label: string; fn: FunctionDeclaration }>,
    componentDocs: Map<string, ComponentDoc>,
    propsDecls: ReadonlyMap<string, InterfaceDeclaration>,
  ): SlotInfo[] {
    const where = this.#rel(join(this.#srcDir, entry.folder ?? ''));
    this.#stateTable ??= readStateTable(
      this.#sourceProject,
      join(this.#srcDir, 'contracts', 'state.ts'),
    );
    const scan = scanSlots(
      this.#sourceProject,
      join(this.#srcDir, entry.folder ?? ''),
      new Set(components.keys()),
      this.#stateTable,
      this.#rel,
    );
    this.#errors.push(...scan.errors);

    const bySlot = new Map<string, SlotOccurrence[]>();
    for (const occurrence of scan.occurrences) {
      bySlot.set(occurrence.slot, [...(bySlot.get(occurrence.slot) ?? []), occurrence]);
    }
    const rootSlot = new Map<string, string>();
    for (const occurrence of scan.occurrences) {
      if (!occurrence.root) continue;
      const previous = rootSlot.get(occurrence.component);
      if (previous !== undefined && previous !== occurrence.slot) {
        this.#errors.push(
          `${where}: ${occurrence.component} has two roots (${previous}, ${occurrence.slot})`,
        );
      }
      rootSlot.set(occurrence.component, occurrence.slot);
    }
    for (const [name, slot] of rootSlot) {
      const part = components.get(name)?.label.split('.')[1];
      const expected = part === 'Root' ? manifest.name : kebabCase(name);
      if (slot !== expected) {
        this.#errors.push(
          `${where}: ${name} renders data-slot "${slot}" as its root; §8.2 names it "${expected}"`,
        );
      }
      const doc = componentDocs.get(name);
      if (doc !== undefined) componentDocs.set(name, { ...doc, slot });
    }

    const slots: SlotInfo[] = [];
    for (const [slot, occurrences] of bySlot) {
      const renderers = [...new Set(occurrences.map((occurrence) => occurrence.component))];
      if (renderers.length !== 1) {
        this.#errors.push(
          `${where}: data-slot "${slot}" is rendered by ${renderers.join(' and ')}`,
        );
        continue;
      }
      const component = renderers[0] ?? '';
      const label = components.get(component)?.label ?? component;
      const names = [...new Set(occurrences.flatMap((occurrence) => occurrence.attributes))];
      const attributes: DataAttributeDoc[] = [];
      for (const attribute of names.toSorted(compareStrings)) {
        const doc = this.#attribute(attribute, manifest, propsDecls.get(component));
        if (typeof doc === 'string') this.#errors.push(`${where}: data-slot "${slot}": ${doc}`);
        else attributes.push(doc);
      }
      const interactive = manifest.interactive?.includes(slot) === true;
      slots.push({
        attributes,
        ...(interactive ? { focusTarget: focusTargetOf(manifest, slot) } : {}),
        interactive,
        part: occurrences.some((occurrence) => occurrence.root),
        renderedBy: label,
        slot,
        stateIndicator: (manifest.stateIndicator ?? [])
          .filter((indicator) => indicator.slot === slot)
          .map(({ state, paint }) => (state === undefined ? { paint } : { paint, state })),
      });
    }
    for (const slot of manifest.interactive ?? []) {
      if (!bySlot.has(slot)) {
        this.#errors.push(`${where}: interactive slot "${slot}" is rendered by no component`);
      }
    }
    for (const slot of new Set(
      (manifest.stateIndicator ?? []).map((indicator) => indicator.slot),
    )) {
      if (!bySlot.has(slot)) {
        this.#errors.push(`${where}: stateIndicator slot "${slot}" is rendered by no component`);
      }
    }
    return slots.toSorted((a, b) => compareStrings(a.slot, b.slot));
  }

  #attribute(
    name: string,
    manifest: ComponentConfig,
    props: InterfaceDeclaration | undefined,
  ): DataAttributeDoc | string {
    const entry = this.#input.vocabulary.get(name);
    if (entry === undefined) return `${name} is not in contracts/vocabulary.json (§8.3)`;
    if (entry.reserved) return `${name} is reserved and has no values in 0.x (§8.3)`;
    const camel = camelOf(name);
    let values: string[] | undefined;
    if (!entry.presence) {
      values = entry.values === null ? manifest.variants?.[camel] : [...entry.values];
      if (values === undefined) {
        return `${name} takes its values from component.json "variants.${camel}", which ${manifest.name} does not declare (§8.3 rule 5)`;
      }
    }
    const property = props?.getType().getProperty(camel);
    let mirrors = property !== undefined;
    // An attribute with a value the prop cannot take is not a mirror: `data-side` is the resolved
    // physical side (right, left), while Select.Popup's and Tooltip.Popup's `side` takes logical ones.
    const declared = property?.getDeclarations().find((d) => Node.isPropertySignature(d));
    const typeNode =
      declared !== undefined && Node.isPropertySignature(declared)
        ? declared.getTypeNode()
        : undefined;
    const literals = typeNode === undefined ? undefined : literalValues(typeNode);
    if (mirrors && values !== undefined && literals !== undefined) {
      const allowed = new Set(literals.map(String));
      mirrors = values.every((value) => allowed.has(value));
    }
    return {
      group: entry.group,
      meaning: this.#input.meanings.get(name) ?? '',
      name,
      ...(entry.presence ? { presence: true as const } : {}),
      ...(mirrors ? { prop: camel } : {}),
      ...(values === undefined ? {} : { values }),
    };
  }
}

/** `Omit<Partial<X>, "a">` → `X`, with the keys `Omit` removes. */
function unwrapBase(heritage: ExpressionWithTypeArguments): {
  inner: ExpressionWithTypeArguments | TypeReferenceNode;
  omitted: string[];
} {
  let inner: ExpressionWithTypeArguments | TypeReferenceNode = heritage;
  const omitted: string[] = [];
  for (;;) {
    const name = Node.isExpressionWithTypeArguments(inner)
      ? inner.getExpression().getText()
      : inner.getTypeName().getText();
    const args: TypeNode[] = inner.getTypeArguments();
    const next: TypeNode | undefined = args[0] === undefined ? undefined : unparen(args[0]);
    if (
      (name === 'Omit' || name === 'Partial') &&
      next !== undefined &&
      Node.isTypeReference(next)
    ) {
      if (name === 'Omit') {
        const keys = args[1] === undefined ? undefined : literalValues(args[1]);
        if (keys === undefined || keys.some((key) => typeof key !== 'string')) {
          throw new Error(`cannot read the keys ${inner.getText()} omits`);
        }
        omitted.push(...keys.map(String));
      }
      inner = next;
      continue;
    }
    return { inner, omitted };
  }
}

/** Follows type aliases without type parameters: `NoState` → `Record<string, never>`. */
function resolveAlias(node: TypeNode): TypeNode {
  const current = unparen(node);
  if (!Node.isTypeReference(current) || current.getTypeArguments().length > 0) return current;
  const declaration = declarationOf(current.getTypeName());
  if (
    declaration !== undefined &&
    Node.isTypeAliasDeclaration(declaration) &&
    declaration.getTypeParameters().length === 0
  ) {
    return resolveAlias(declaration.getTypeNodeOrThrow());
  }
  return current;
}

/** A property of an interface or of the `@nizivo/react` interfaces it extends. */
function findMember(
  declaration: InterfaceDeclaration,
  name: string,
): PropertySignature | undefined {
  const own = declaration.getProperty(name);
  if (own !== undefined) return own;
  for (const heritage of declaration.getExtends()) {
    const { inner } = unwrapBase(heritage);
    const reference = Node.isExpressionWithTypeArguments(inner)
      ? inner.getExpression()
      : inner.getTypeName();
    const base = declarationOf(reference);
    if (base !== undefined && Node.isInterfaceDeclaration(base)) {
      const found = findMember(base, name);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
