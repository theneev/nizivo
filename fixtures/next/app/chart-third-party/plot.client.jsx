'use client';
// Stands in for a third-party client renderer (Recharts, ECharts): its own pixel-space SVG, its
// own state (a hovered point), none of Nizivo's classes. Not a dependency of the fixture.
import { useState } from 'react';

export function ThirdPartyPlot({ points }) {
  const [hovered, setHovered] = useState(-1);
  const max = Math.max(...points);
  const step = 720 / (points.length - 1);
  const xy = points.map((p, i) => [i * step, 280 - (p / max) * 260]);
  const d = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return (
    <svg
      viewBox="0 0 720 280"
      width="100%"
      height="100%"
      aria-hidden="true"
      onPointerLeave={() => setHovered(-1)}
    >
      <path d={`${d}L720,280L0,280Z`} fill="currentColor" opacity="0.1" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      {xy.map(([x, y], i) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r={i === hovered ? 5 : 3}
          fill="currentColor"
          onPointerEnter={() => setHovered(i)}
        />
      ))}
    </svg>
  );
}
