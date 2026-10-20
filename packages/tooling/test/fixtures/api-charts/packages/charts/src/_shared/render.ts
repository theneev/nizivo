// Fixture: reduced to what `nz api` reads, the name and the state argument.
export type RenderProp<S> = (props: Record<string, unknown>, state: S) => unknown;
