// The second-adapter file layout (ARCHITECTURE.md §9.4, D-cc; COMPONENT-JSON.md `adapter`):
// `src/_engines/<engine>/<name>.<adapter>.client.tsx`. Tested through NZ_ADAPTER, but not engine.ts's
// target, so not built or shipped until it becomes the default: the size checks and the release
// directive guard leave it out.
const SECOND_ADAPTER = /(^|\/)_engines\/[^/]+\/[^/.]+\.[^/.]+\.client\.tsx$/;

/** Whether a path (any separator) is a second adapter. */
export function isSecondAdapter(path: string): boolean {
  return SECOND_ADAPTER.test(path.replaceAll('\\', '/'));
}
