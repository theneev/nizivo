// Components available to every MDX page: Fumadocs' defaults plus the generated tables.
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { BuilderChoices, Degradations, OverridesTable, ProposalsTable } from './deviations';
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
import { ComponentIndex } from './component-index';
import { TailwindMap, TailwindSample } from './tailwind';
import { ThemeScopesDemo } from './theme-demo';

export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  Callout,
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
  OverridesTable,
  ProposalsTable,
  BuilderChoices,
  Degradations,
  ThemeScopesDemo,
  TailwindMap,
  TailwindSample,
  ComponentIndex,
};
