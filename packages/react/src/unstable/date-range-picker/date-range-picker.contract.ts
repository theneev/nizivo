// Public, engine-free types and the DateRangePickerEngine interface (ARCHITECTURE.md §9.2, §16.3).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import type { ControlSize } from '../../augment';
import type { ChangeDetails } from '../../contracts/details';
import type { RenderFn } from '../../_internal/engine-part';

/** A range of ISO plain dates (`'2026-10-01'`), both ends included (§16.3). */
export interface DateRange {
  start: string;
  end: string;
}

/** A preset's key. `today` and the others are counted in `timeZone`. */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'last-30-days'
  | 'this-quarter'
  | 'year-to-date';

/** `'preset'`, `'calendar'`: how the applied range was chosen; `'clear'` is not used yet. */
export type DateRangePickerValueReason = 'preset' | 'calendar';

/** DateRangePicker's own strings (§16.4): serialisable, English defaults. */
export interface DateRangePickerLabels {
  /** The trigger's text with no range. @default 'Select dates' */
  placeholder: string;
  /** How a range reads, in the trigger and the footer. @default '{start} – {end}' */
  range: string;
  /** The footer's button that keeps the old range. @default 'Cancel' */
  cancel: string;
  /** The footer's button that keeps the new one. @default 'Apply' */
  apply: string;
  /** The presets list's name. @default 'Presets' */
  presets: string;
  /** @default 'Today' */
  today: string;
  /** @default 'Yesterday' */
  yesterday: string;
  /** @default 'Last 7 days' */
  last7Days: string;
  /** @default 'Last 30 days' */
  last30Days: string;
  /** @default 'This quarter' */
  thisQuarter: string;
  /** @default 'Year to date' */
  yearToDate: string;
}

export interface DateRangePickerState {
  size: ControlSize;
  open: boolean;
  disabled: boolean;
  invalid: boolean;
  /** A range is applied. */
  filled: boolean;
}

export interface DateRangePickerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'type'
> {
  /** The time zone "today" is in, for the presets and the today mark (§16.3). */
  timeZone: string;
  /** Controlled range; `null` is no range. Pair it with `onValueChange`. */
  value?: DateRange | null;
  /** Uncontrolled starting range. */
  defaultValue?: DateRange | null;
  /** Called when Apply keeps a new range. */
  onValueChange?: (value: DateRange, details: ChangeDetails<DateRangePickerValueReason>) => void;
  /** Earliest pickable date, ISO. */
  min?: string;
  /** Latest pickable date, ISO. */
  max?: string;
  /** The presets beside the calendar, in this order; `[]` shows none. @default all six */
  presets?: readonly DateRangePreset[];
  /** The form field: one hidden input whose value is the ISO interval `start/end`. */
  name?: string;
  /** BCP 47 locale for the dates. Defaults to NizivoConfig's, else `'en-US'`. */
  locale?: string;
  /** 32 / 40 / 48 px, as Select's trigger. @default 'md' */
  size?: ControlSize;
  invalid?: boolean;
  /** Opens the popover on the first render (after hydration). */
  defaultOpen?: boolean;
  labels?: Partial<DateRangePickerLabels>;
}

/** A day cell's state, for its classes and data attributes. */
export interface DateRangePickerDayState {
  /** The cell's ISO date. */
  date: string;
  selected: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  outsideMonth: boolean;
  disabled: boolean;
  focusVisible: boolean;
  hovered: boolean;
  pressed: boolean;
}

export interface DateRangePickerNavState {
  disabled: boolean;
  focusVisible: boolean;
  hovered: boolean;
  pressed: boolean;
}

type Parts = Record<string, unknown>;

/**
 * What every DateRangePicker adapter implements: the calendar of one month. Adapters write no class
 * names; the leaf's render functions add them. Values cross as ISO plain dates.
 */
export interface DateRangePickerEngine {
  Calendar(p: {
    value: DateRange | null;
    onChange: (value: DateRange) => void;
    /** The day the keyboard is on, ISO; it decides the month shown. */
    focused: string;
    onFocusChange: (date: string) => void;
    min?: string | undefined;
    max?: string | undefined;
    'aria-label': string;
    root: RenderFn<Parts>;
    header: RenderFn<Parts>;
    heading: RenderFn<Parts>;
    previous: RenderFn<DateRangePickerNavState>;
    next: RenderFn<DateRangePickerNavState>;
    grid: RenderFn<Parts>;
    weekday: RenderFn<Parts>;
    day: RenderFn<DateRangePickerDayState>;
  }): ReactElement;
}
