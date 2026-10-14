/**
 * Reads the named exports of a TypeScript module with the TypeScript 6 parser (syntax only, no type
 * checker), so `nz gen` can verify that every name it re-exports really exists.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from '@typescript/typescript6';

/** Where an export comes from: another module (`export { a } from './x'`, or an imported binding) or this one. */
interface ExportEntry {
  from?: { specifier: string; name: string };
}

export interface ModuleExports {
  values: Map<string, ExportEntry>;
  types: Map<string, ExportEntry>;
}

const cache = new Map<string, ModuleExports>();

export function clearExportCache(): void {
  cache.clear();
}

export function readExports(file: string): ModuleExports {
  let result = cache.get(file);
  if (result === undefined) {
    result = parseExports(file);
    cache.set(file, result);
  }
  return result;
}

function parse(file: string): ts.SourceFile {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, kind);
}

/**
 * The member names of an exported interface, in declaration order, or `undefined` when the module
 * does not export one by that name. Only the interface's own members are read (no `extends`).
 */
export function interfaceMembers(file: string, name: string): string[] | undefined {
  for (const statement of parse(file).statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === name &&
      hasExportModifier(statement)
    ) {
      return statement.members.flatMap((member) =>
        member.name !== undefined &&
        (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
          ? [member.name.text]
          : [],
      );
    }
  }
  return undefined;
}

function parseExports(file: string): ModuleExports {
  const source = parse(file);
  const values = new Map<string, ExportEntry>();
  const types = new Map<string, ExportEntry>();
  const locals = localBindings(source);

  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      const specifier =
        statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      if (clause === undefined) continue; // `export * from`: not followed (generated barrels use named exports only)
      if (ts.isNamespaceExport(clause)) {
        values.set(clause.name.text, {});
        continue;
      }
      for (const element of clause.elements) {
        const exported = element.name.text;
        const local = element.propertyName?.text ?? exported;
        const typeOnly = statement.isTypeOnly || element.isTypeOnly;
        if (specifier !== undefined) {
          (typeOnly ? types : values).set(exported, { from: { specifier, name: local } });
        } else {
          const binding = locals.get(local);
          const entry: ExportEntry = binding?.from === undefined ? {} : { from: binding.from };
          (typeOnly || binding?.type === true ? types : values).set(exported, entry);
        }
      }
      continue;
    }
    if (!hasExportModifier(statement) || hasDefaultModifier(statement)) continue;
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (statement.name !== undefined) values.set(statement.name.text, {});
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingNames(declaration.name)) values.set(name, {});
      }
    } else if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      types.set(statement.name.text, {});
    }
  }
  return { values, types };
}

interface LocalBinding {
  type: boolean;
  from?: { specifier: string; name: string };
}

/** Module-level names, so `export { X }` can be classified as a value or a type and followed if imported. */
function localBindings(source: ts.SourceFile): Map<string, LocalBinding> {
  const locals = new Map<string, LocalBinding>();
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      locals.set(statement.name.text, { type: true });
    } else if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause === undefined) continue;
      if (clause.name !== undefined) {
        locals.set(clause.name.text, {
          type: clause.isTypeOnly,
          from: { specifier, name: 'default' },
        });
      }
      const named = clause.namedBindings;
      if (named !== undefined && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          const name = element.propertyName?.text ?? element.name.text;
          locals.set(element.name.text, {
            type: clause.isTypeOnly || element.isTypeOnly,
            from: { specifier, name },
          });
        }
      } else if (named !== undefined) {
        locals.set(named.name.text, { type: clause.isTypeOnly, from: { specifier, name: '*' } });
      }
    }
  }
  return locals;
}

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
  );
}

function hasExportModifier(node: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function hasDefaultModifier(node: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
  );
}

/** Resolves a relative specifier the way the library's `bundler` resolution does for source files. */
export function resolveModule(fromFile: string, specifier: string): string | undefined {
  const base = resolve(dirname(fromFile), specifier.replace(/\.js$/, ''));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate));
}

/**
 * The declaration an export finally points at, as `<file or package>#<name>`, following re-export
 * chains through relative modules. Two exports with the same origin are the same binding.
 */
export function exportOrigin(
  file: string,
  name: string,
  kind: 'value' | 'type',
  seen = new Set<string>(),
): string {
  const key = `${file}#${name}`;
  if (seen.has(key)) return key;
  seen.add(key);
  const exports = readExports(file);
  const entry = (kind === 'type' ? exports.types.get(name) : undefined) ?? exports.values.get(name);
  const from = entry?.from;
  if (from === undefined) return key;
  if (!from.specifier.startsWith('.')) return `${from.specifier}#${from.name}`;
  const target = resolveModule(file, from.specifier);
  if (target === undefined || from.name === '*' || from.name === 'default') {
    return `${resolve(dirname(file), from.specifier)}#${from.name}`;
  }
  return exportOrigin(target, from.name, kind, seen);
}
