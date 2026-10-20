import { jsx } from 'react/jsx-runtime';
//#region src/spark/spark.tsx
function Spark({ data }) {
  return /* @__PURE__ */ jsx('span', {
    className: 'nz-spark',
    'data-slot': 'spark',
    'data-count': data.length,
  });
}
//#endregion
export { Spark };
