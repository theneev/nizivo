'use client';
// DateRangePicker (ARCHITECTURE.md §16.3; Figma's Date Range Picker 746:267). UNSTABLE: design has
// not drawn the unavailable day or a comparison period yet. A trigger in Select's look shows the
// applied range; it opens a popover (the Popover's own behaviour: focus moves in, Escape or an
// outside press closes it, focus returns) with Figma's three areas: presets, one month of React
// Aria's RangeCalendar, and a footer with the chosen range, Cancel and Apply. Nothing is applied
// until Apply: Cancel, Escape and an outside press keep the old range. Values are ISO plain dates;
// "today" (the presets, the today mark) is counted in the required `timeZone`. The server renders
// only the trigger and the hidden form input (closed overlays emit no popup HTML), so nothing that
// depends on the clock reaches the server HTML.
import {
  lazy,
  Suspense,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from 'react';
import { Button } from '../../button/index';
import { useLabels, useResolvedLocale } from '../../config/config.client';
import { details } from '../../contracts/details';
import { toRenderFn } from '../../contracts/render';
import { stateAttrs } from '../../contracts/state';
import { cx } from '../../_internal/cx';
import { joinIds } from '../../_internal/field';
import { CalendarGlyph, ChevronGlyph, ChevronsUpDownGlyph } from '../../_internal/glyphs';
import { useFieldControl } from '../../field/field-scope.client';
import { PopoverPopup, PopoverRoot, PopoverTrigger } from '../../popover/popover.client';
import type {
  DateRange,
  DateRangePickerDayState,
  DateRangePickerLabels,
  DateRangePickerNavState,
  DateRangePickerProps,
  DateRangePreset,
  DateRangePickerState,
} from './date-range-picker.contract';
/**
 * React Aria's RangeCalendar loads on the first open, in its own chunk (§16.3, M71): the page ships
 * the trigger and the presets, not the calendar. Until it arrives the calendar's box holds its
 * place, so the popup does not jump.
 */
const Calendar = lazy(() => import('./engine').then((engine) => ({ default: engine.Calendar })));

/**
 * On the first open the Popover chooses its first focus (§12.2) before the calendar has arrived, so
 * with no presets it lands past it, in the footer. When the calendar mounts, the body's first button
 * takes focus back if it is still there, as when the calendar was in the popup from the start.
 */
function FocusOnArrival({ body }: { body: RefObject<HTMLDivElement | null> }): null {
  useLayoutEffect(() => {
    if (document.activeElement?.closest('.nz-date-range-picker-footer')) {
      body.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    }
  }, [body]);
  return null;
}

const ALL_PRESETS: readonly DateRangePreset[] = [
  'today',
  'yesterday',
  'last-7-days',
  'last-30-days',
  'this-quarter',
  'year-to-date',
];

const PRESET_LABEL: Record<DateRangePreset, keyof DateRangePickerLabels> = {
  today: 'today',
  yesterday: 'yesterday',
  'last-7-days': 'last7Days',
  'last-30-days': 'last30Days',
  'this-quarter': 'thisQuarter',
  'year-to-date': 'yearToDate',
};

/** An ISO plain date `days` after (or before) `iso`, by the calendar, in UTC. */
function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today's ISO plain date in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** A preset's range, counted back from `today` (an ISO date in the picker's time zone). */
export function presetRange(preset: DateRangePreset, today: string): DateRange {
  const [year = '1970', month = '01'] = today.split('-');
  switch (preset) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday':
      return { start: addDays(today, -1), end: addDays(today, -1) };
    case 'last-7-days':
      return { start: addDays(today, -6), end: today };
    case 'last-30-days':
      return { start: addDays(today, -29), end: today };
    case 'this-quarter': {
      const first = Math.floor((Number(month) - 1) / 3) * 3 + 1;
      return { start: `${year}-${String(first).padStart(2, '0')}-01`, end: today };
    }
    case 'year-to-date':
    default:
      return { start: `${year}-01-01`, end: today };
  }
}

/**
 * How a range reads: each end formatted on its own and joined through `template` (never
 * `formatRange`, whose spacing differs between ICU versions, so the server and the browser could
 * disagree). The start drops its year when both ends share one: "Oct 1 – Oct 7, 2026".
 */
const utc = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

export function formatDateRange(value: DateRange, locale: string, template: string): string {
  const sameYear = value.start.slice(0, 4) === value.end.slice(0, 4);
  const end = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const start = sameYear
    ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : end;
  return template
    .replace('{start}', start.format(utc(value.start)))
    .replace('{end}', end.format(utc(value.end)));
}

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderButton = toRenderFn<unknown>(undefined, 'button');
const renderTh = toRenderFn<unknown>(undefined, 'th');
const renderTable = toRenderFn<unknown>(undefined, 'table');
const renderH2 = toRenderFn<unknown>(undefined, 'h2');
const renderHeader = toRenderFn<unknown>(undefined, 'header');

/** A month button: the chevron, turned for the previous month in date-range-picker.css. */
const nav = (props: Record<string, unknown>, s: DateRangePickerNavState): JSX.Element =>
  renderButton(
    {
      ...props,
      className: 'nz-date-range-picker-nav',
      'data-slot': 'date-range-picker-nav',
      ...stateAttrs({
        disabled: s.disabled,
        focusVisible: s.focusVisible,
        pressed: s.pressed,
      }),
      children: (
        <span className="nz-date-range-picker-nav-icon" aria-hidden="true">
          <ChevronGlyph />
        </span>
      ),
    },
    s,
  );

export function DateRangePicker({
  timeZone,
  value: controlled,
  defaultValue = null,
  onValueChange,
  min,
  max,
  presets = ALL_PRESETS,
  name,
  locale: localeProp,
  size = 'md',
  invalid: invalidProp,
  disabled: disabledProp,
  defaultOpen = false,
  labels: labelsProp,
  id: idProp,
  'aria-labelledby': labelledByProp,
  'aria-describedby': describedByProp,
  className,
  ...rest
}: DateRangePickerProps): JSX.Element {
  const labels = useLabels('dateRangePicker', labelsProp);
  const L: DateRangePickerLabels = {
    placeholder: labels?.placeholder ?? 'Select dates',
    range: labels?.range ?? '{start} – {end}',
    cancel: labels?.cancel ?? 'Cancel',
    apply: labels?.apply ?? 'Apply',
    presets: labels?.presets ?? 'Presets',
    today: labels?.today ?? 'Today',
    yesterday: labels?.yesterday ?? 'Yesterday',
    last7Days: labels?.last7Days ?? 'Last 7 days',
    last30Days: labels?.last30Days ?? 'Last 30 days',
    thisQuarter: labels?.thisQuarter ?? 'This quarter',
    yearToDate: labels?.yearToDate ?? 'Year to date',
  };
  const resolved = useResolvedLocale();
  const locale = localeProp ?? resolved;
  // Field wiring as Select: a label click focuses the trigger and never opens the popover
  const field = useFieldControl({
    id: idProp,
    name,
    disabled: disabledProp,
    invalid: invalidProp,
    labelBehavior: 'focus',
  });
  const valueId = useId();
  const body = useRef<HTMLDivElement | null>(null);

  const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue);
  const applied = controlled === undefined ? uncontrolled : controlled;
  const [open, setOpen] = useState(defaultOpen);
  // what the popover shows until Apply: the applied range when it opened
  const [draft, setDraft] = useState<DateRange | null>(applied);
  const [chosen, setChosen] = useState<DateRangePreset | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const today = (): string => todayIn(timeZone);
  const openWith = (next: boolean): void => {
    if (next) {
      setDraft(applied);
      setChosen(null);
      setFocused(applied?.end ?? today());
    }
    setOpen(next);
  };
  const apply = (): void => {
    if (draft === null) return;
    if (controlled === undefined) setUncontrolled(draft);
    onValueChange?.(draft, details(chosen === null ? 'calendar' : 'preset'));
    setOpen(false);
  };

  const state: DateRangePickerState = {
    size,
    open,
    disabled: field.disabled,
    invalid: field.invalid,
    filled: applied !== null,
  };
  // the popup is named by the Field label, else by the picker's own name
  const popupLabelledBy = labelledByProp ?? field.labelledBy;
  const text = applied === null ? L.placeholder : formatDateRange(applied, locale, L.range);
  // the today mark is computed on the client only: the popup never renders on the server
  const todayIso = open ? today() : '';

  // React Aria renders the <td>; this is the day inside it
  const day = (props: Record<string, unknown>, s: DateRangePickerDayState): JSX.Element =>
    renderDiv(
      {
        ...props,
        className: 'nz-date-range-picker-day',
        'data-slot': 'date-range-picker-day',
        // the keyboard ring sits inside the cell, as on the menu rows (§8.5)
        'data-focus-inset': '',
        ...stateAttrs({
          selected: s.selected,
          disabled: s.disabled,
          focusVisible: s.focusVisible,
          pressed: s.pressed,
        }),
        'data-range-start': s.rangeStart ? '' : undefined,
        'data-range-end': s.rangeEnd ? '' : undefined,
        'data-outside-month': s.outsideMonth ? '' : undefined,
        'data-today': s.date === todayIso ? '' : undefined,
      },
      s,
    );
  return (
    <>
      <PopoverRoot open={open} onOpenChange={openWith}>
        <PopoverTrigger
          {...rest}
          id={field.id}
          disabled={field.disabled}
          aria-labelledby={joinIds(valueId, labelledByProp ?? field.labelledBy)}
          aria-describedby={joinIds(field.describedBy, describedByProp)}
          className={className}
          data-size={size}
          {...stateAttrs({ invalid: state.invalid })}
          // the Popover names its trigger popover-trigger; this one is the picker's
          render={(props) => (
            <button
              {...props}
              type="button"
              className={cx(
                'nz-date-range-picker-trigger nz-select-trigger',
                typeof props['className'] === 'string' ? props['className'] : undefined,
              )}
              data-slot="date-range-picker-trigger"
            />
          )}
        >
          <span className="nz-date-range-picker-icon nz-select-icon" aria-hidden="true">
            <CalendarGlyph />
          </span>
          <span
            id={valueId}
            className="nz-date-range-picker-value nz-select-value"
            data-placeholder={applied === null ? '' : undefined}
          >
            {text}
          </span>
          <span className="nz-select-chevron" aria-hidden="true">
            <ChevronsUpDownGlyph />
          </span>
        </PopoverTrigger>
        <PopoverPopup
          side="bottom"
          align="start"
          sideOffset={4}
          {...(popupLabelledBy === undefined
            ? { 'aria-label': rest['aria-label'] ?? L.placeholder }
            : { 'aria-labelledby': popupLabelledBy })}
          className="nz-date-range-picker-popup"
        >
          <div className="nz-date-range-picker-body" ref={body}>
            {presets.length > 0 && (
              <fieldset className="nz-date-range-picker-presets" aria-label={L.presets}>
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="nz-date-range-picker-preset"
                    data-slot="date-range-picker-preset"
                    aria-pressed={chosen === preset}
                    onClick={() => {
                      const picked = presetRange(preset, today());
                      setDraft(picked);
                      setChosen(preset);
                      setFocused(picked.end);
                    }}
                  >
                    {L[PRESET_LABEL[preset]]}
                  </button>
                ))}
              </fieldset>
            )}
            <Suspense
              fallback={
                <div
                  className="nz-date-range-picker-calendar nz-date-range-picker-pending"
                  aria-hidden="true"
                />
              }
            >
              <Calendar
                value={draft}
                onChange={(picked) => {
                  setDraft(picked);
                  setChosen(null);
                }}
                focused={focused ?? applied?.end ?? today()}
                onFocusChange={setFocused}
                min={min}
                max={max}
                aria-label={L.placeholder}
                root={(p) => renderDiv({ ...p, className: 'nz-date-range-picker-calendar' }, {})}
                header={(p) => renderHeader({ ...p, className: 'nz-date-range-picker-header' }, {})}
                heading={(p) => renderH2({ ...p, className: 'nz-date-range-picker-heading' }, {})}
                previous={nav}
                next={nav}
                grid={(p) => renderTable({ ...p, className: 'nz-date-range-picker-grid' }, {})}
                weekday={(p) => renderTh({ ...p, className: 'nz-date-range-picker-weekday' }, {})}
                day={day}
              />
              <FocusOnArrival body={body} />
            </Suspense>
          </div>
          <div className="nz-date-range-picker-footer">
            <span className="nz-date-range-picker-range">
              {draft === null ? '' : formatDateRange(draft, locale, L.range)}
            </span>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {L.cancel}
            </Button>
            <Button disabled={draft === null} onClick={apply}>
              {L.apply}
            </Button>
          </div>
        </PopoverPopup>
      </PopoverRoot>
      {field.name !== undefined && (
        <input
          type="hidden"
          name={field.name}
          value={applied === null ? '' : `${applied.start}/${applied.end}`}
        />
      )}
    </>
  );
}
