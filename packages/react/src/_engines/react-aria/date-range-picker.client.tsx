'use client';
// The ONLY DateRangePicker module that imports the engine (ARCHITECTURE.md §9.2, §16.3). Behaviour
// only: no class names. React Aria's RangeCalendar is the grid of one month: arrow keys move by day,
// Page Up / Page Down by month, Home / End to the week's ends, Enter or a press picks the start and
// then the end, and the previous and next buttons page the month (their names are React Aria's,
// localized). Dates cross the seam as ISO plain dates; inside they are CalendarDate.
import { parseDate, type CalendarDate } from '@internationalized/date';
import type { JSX } from 'react';
import {
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  RangeCalendar,
} from 'react-aria-components';
import { mergeProps } from '../../contracts/merge-props';
import type {
  DateRangePickerDayState,
  DateRangePickerEngine,
  DateRangePickerNavState,
} from '../../unstable/date-range-picker/date-range-picker.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';

const date = (iso: string | undefined): CalendarDate | undefined =>
  iso === undefined ? undefined : parseDate(iso);

/** React Aria's month button (`slot` previous or next), drawn by the leaf. */
const nav = (
  which: 'previous' | 'next',
  render: (p: Record<string, unknown>, s: DateRangePickerNavState) => JSX.Element,
): JSX.Element => (
  <Button
    slot={which}
    render={(p, rp) =>
      render(engineDom(p), {
        disabled: rp.isDisabled,
        focusVisible: rp.isFocusVisible,
        hovered: rp.isHovered,
        pressed: rp.isPressed,
      })
    }
  />
);

export const Calendar: DateRangePickerEngine['Calendar'] = ({
  value,
  onChange,
  focused,
  onFocusChange,
  min,
  max,
  'aria-label': label,
  root,
  header,
  heading,
  previous,
  next,
  grid,
  weekday,
  day,
}) => {
  return (
    <EngineLocale>
      <RangeCalendar
        {...defined({ minValue: date(min), maxValue: date(max) })}
        aria-label={label}
        value={value === null ? null : { start: parseDate(value.start), end: parseDate(value.end) }}
        onChange={(range) => onChange({ start: range.start.toString(), end: range.end.toString() })}
        focusedValue={parseDate(focused)}
        onFocusChange={(when) => onFocusChange(when.toString())}
        render={(p) => root(engineDom(p), {})}
      >
        {header(
          {
            children: (
              <>
                {nav('previous', previous)}
                <Heading render={(p) => heading(engineDom(p), {})} />
                {nav('next', next)}
              </>
            ),
          },
          {},
        )}
        <CalendarGrid weekdayStyle="short" render={(p) => grid(engineDom(p), {})}>
          <CalendarGridHeader>
            {(name) => (
              <CalendarHeaderCell
                render={(p) => weekday(mergeProps(engineDom(p), { children: name }), {})}
              />
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(cell) => (
              <CalendarCell
                date={cell}
                render={(p, rp) => {
                  const s: DateRangePickerDayState = {
                    date: rp.date.toString(),
                    selected: rp.isSelected,
                    rangeStart: rp.isSelectionStart,
                    rangeEnd: rp.isSelectionEnd,
                    outsideMonth: rp.isOutsideMonth,
                    disabled: rp.isDisabled || rp.isUnavailable,
                    focusVisible: rp.isFocusVisible,
                    hovered: rp.isHovered,
                    pressed: rp.isPressed,
                  };
                  return day(engineDom(p), s);
                }}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </RangeCalendar>
    </EngineLocale>
  );
};
