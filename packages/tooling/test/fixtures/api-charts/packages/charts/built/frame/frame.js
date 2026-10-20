import { jsx, jsxs } from 'react/jsx-runtime';
//#region src/frame/frame.tsx
const frameLabels = { loading: 'Loading' };
function Frame({ title, children, ...rest }) {
  return /* @__PURE__ */ jsxs('figure', {
    ...rest,
    className: 'nz-frame',
    'data-slot': 'frame',
    children: [/* @__PURE__ */ jsx('figcaption', { children: title }), children],
  });
}
//#endregion
export { Frame, frameLabels };
