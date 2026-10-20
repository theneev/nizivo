//#region src/_core/scale.ts
/** A linear scale. */
function linear(domain) {
  const [from, to] = domain;
  return Object.assign((value) => (value - from) / (to - from), { domain: () => [from, to] });
}
//#endregion
export { linear };
