// Components available to every MDX page: Fumadocs' defaults plus the generated tables.
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
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
import { Changelog } from './changelog';
import { ClientPagingDemo, ClientSortDemo } from './client-demos';
import { ComponentIndex } from './component-index';
import { BrandGrid, IconCount, IconGrid } from './icons';
import { JsRefGroups, TokensJsonCount, TokensJsonEntry, TokensJsonSummary } from './js-tokens';
import { TailwindMap, TailwindSample } from './tailwind';
import { ThemeScopesDemo } from './theme-demo';
import { MarkdownTable } from './table';

export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  table: MarkdownTable,
  Callout,
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
