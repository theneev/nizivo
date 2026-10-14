// @nizivo/testkit: conformance suites (src/conformance) and overlay O-tests (src/overlay) land here (ARCHITECTURE.md §9.6, §12.5).
export { CONFORMANCE_AREAS } from './conformance/contract.ts';
export type { ComponentContract, ConformanceArea, PartContract } from './conformance/contract.ts';
export { selectContract } from './conformance/select.conformance.ts';
export { dialogContract } from './conformance/dialog.conformance.ts';
export { tooltipContract } from './conformance/tooltip.conformance.ts';
