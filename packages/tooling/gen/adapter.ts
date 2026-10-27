// The second-adapter file layout (ARCHITECTURE.md §9.4, D-cc; COMPONENT-JSON.md `adapter`):
// `src/_engines/<engine>/<name>.<adapter>.client.tsx`. Tested through NZ_ADAPTER, but not engine.ts's
// target, so not built or shipped until it becomes the default: the size checks and the release
// directive guard leave it out. The same holds for a second engine family's folder, the Base UI
// canary's `src/_engines/base-ui/` (D-dk).
const SECOND_ADAPTER = /(^|\/)_engines\/[^/]+\/[^/.]+\.[^/.]+\.client\.tsx$/;
const SECOND_FAMILY = /(^|\/)_engines\/base-ui\//;

/** Whether a path (any separator) is a second adapter, or in a second engine family. */
export function isSecondAdapter(path: string): boolean {
  const posix = path.replaceAll('\\', '/');
  return SECOND_ADAPTER.test(posix) || SECOND_FAMILY.test(posix);
}
