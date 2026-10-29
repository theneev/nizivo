// Components available to every MDX page: Fumadocs' defaults, the kit's Alert and Docs Card in place
// of Fumadocs' callout and cards (M90), and the generated tables.
import type { JSX } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import {
  ColourSwatches,
  ElevationScale,
  FontFamilies,
  MotionTokens,
  PrimitivePalette,
  RadiusScale,
  ResponsiveTokens,
  ShadowValues,
  SizeScale,
  SpaceScale,
  TokenReference,
  TypeScale,
  ZIndexScale,
} from './foundations';
import { Callout } from './callout';
import { Card, Cards } from './cards';
import { Changelog } from './changelog';
import { ClientPagingDemo, ClientSortDemo } from './client-demos';
import { ComponentIndex } from './component-index';
import { BrandGrid, IconCount, IconGrid } from './icons';
import { JsRefGroups, TokensJsonCount, TokensJsonEntry, TokensJsonSummary } from './js-tokens';
import { TailwindMap, TailwindSample } from './tailwind';
import { ThemeScopesDemo } from './theme-demo';
import { MarkdownTable } from './table';
import { VERSION } from '../lib/version';

/** The released version, read from @nizivo/react's package.json at build time (lib/version.ts). */
function Version(): JSX.Element {
  return <>{VERSION}</>;
}

export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  table: MarkdownTable,
  Callout,
  Card,
  Cards,
  Version,
  Changelog,
  ClientPagingDemo,
  ClientSortDemo,
  Steps,
  Step,
  Tabs,
  Tab,
  ColourSwatches,
  PrimitivePalette,
  TypeScale,
  FontFamilies,
  SpaceScale,
  SizeScale,
  RadiusScale,
  ResponsiveTokens,
  ZIndexScale,
  ElevationScale,
  ShadowValues,
  MotionTokens,
  TokenReference,
  IconGrid,
  BrandGrid,
  IconCount,
  JsRefGroups,
  TokensJsonCount,
  TokensJsonEntry,
  TokensJsonSummary,
  ThemeScopesDemo,
  TailwindMap,
  TailwindSample,
  ComponentIndex,
};
