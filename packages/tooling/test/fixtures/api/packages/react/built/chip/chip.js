//#region src/chip/chip.tsx
const CHIP_SIZES = ['sm', 'md'];
function Chip() {
  return null;
}
function chipLabel(tone, ...extra) {
  return [tone, ...extra].join(' ');
}
//#endregion
export { CHIP_SIZES, Chip, chipLabel };
