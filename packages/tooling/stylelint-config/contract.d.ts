export interface VocabularyEntry {
  name: string;
  group: 'state' | 'presentational' | 'local' | 'scope';
  presence: boolean;
  /** Allowed values; empty for a presence attribute; null when each component manifest lists them. */
  values: readonly string[] | null;
  reserved: boolean;
}

export type Vocabulary = ReadonlyMap<string, VocabularyEntry>;

export interface ComponentManifest {
  name: string;
  /** The name, plus each `exports` member in kebab-case: a slot or hook starts with one of these. */
  prefixes: readonly string[];
  variants: Readonly<Record<string, readonly string[]>>;
}

export type Components = ReadonlyMap<string, ComponentManifest>;

export declare const REPO_ROOT: string;
export declare const CLASS_PATTERN: RegExp;
export declare const RUNTIME_VARIABLES: ReadonlySet<string>;
/** Surface variables (M42): name → the one component whose stylesheet declares it. */
export declare const SURFACE_VARIABLES: ReadonlyMap<string, string>;
export declare const NATIVE_OVERLAY_STATE: ReadonlySet<string>;
export declare const DISCLOSURE_PARTS: ReadonlySet<string>;

export declare function layerStatement(root?: string): string;
export declare function layerNames(statement: string): string[];
export declare function loadVocabulary(root?: string): Vocabulary;
export declare function loadComponents(root?: string): Components;
export declare function componentOf(
  file: string,
  components: Components,
): ComponentManifest | undefined;
export declare function expectedLayer(file: string): string;
export declare function expectedLayers(file: string): string[];
export interface AttributeContext {
  vocabulary: Vocabulary;
  components: Components;
  /** The stylesheet's component; undefined for shared files such as base.css. */
  component?: ComponentManifest | undefined;
}

export interface VariableContext {
  component?: ComponentManifest | undefined;
  /** The token names; undefined while @nizivo/tokens does not publish them. */
  tokens?: ReadonlySet<string> | undefined;
}

export declare function attributeProblem(
  attribute: { name: string; operator?: string | undefined; value?: string | undefined },
  context: AttributeContext,
): string | undefined;
/**
 * `private` (`--_nz-*`), `runtime` (§8.3), `token` (in the token names), `hook` (`--nz-<component
 * prefix>-*` of this stylesheet's component), `foreign` (not `--nz-*`), `primitive` (`--nz-p-*`),
 * `unknown` (none of these), or `unchecked` (no token names to tell a hook from a token).
 */
export type VariableKind =
  | 'private'
  | 'foreign'
  | 'primitive'
  | 'runtime'
  | 'token'
  | 'hook'
  | 'unknown'
  | 'unchecked';

export declare function classifyVariable(name: string, context: VariableContext): VariableKind;
export declare function variableProblem(
  variable: { name: string; hasFallback: boolean },
  context: VariableContext,
): string | undefined;
export declare function tokensFile(subpath: string): string | undefined;
export declare function loadContractTokens(): ReadonlySet<string> | undefined;
