'use client';
// ModelSelector (ARCHITECTURE.md §21.4a; D-dn; Figma's Model Selector 7410:384 and Model Menu
// 7410:394): which model answers, as a trade-off in plain words ("Fast", "Balanced", "Deep"), never a
// version number. It is a Select: a pill trigger with the sparkles, and a listbox whose options say
// what each one trades ("Quick answers for simple tasks"); the chosen one is Semibold with a check.
// No new engine: keyboard, typeahead, focus and the hidden native <select> are Select's.
// UNSTABLE: the AI kit is new and unreviewed.
import { useId, useState, type JSX } from 'react';
import { useLabels } from '../../config/config.client';
import type { ChangeDetails } from '../../contracts/details';
import { cx } from '../../_internal/cx';
import { ChevronGlyph, SparklesGlyph } from '../../_internal/glyphs';
import { Select, type SelectValueReason } from '../../select/index';

/** One choice. */
export interface ModelOption {
  value: string;
  /** The trade-off's name: "Balanced". */
  label: string;
  /** What it trades, in words: "Good for most work". */
  description?: string;
  disabled?: boolean;
}

/** ModelSelector's own strings (§16.4): serialisable, English defaults. */
export interface ModelSelectorLabels {
  /**
   * Names the trigger, after the chosen model ("Balanced Model"), as every Select reads.
   * @default 'Model'
   */
  label: string;
}

export interface ModelSelectorProps {
  models: readonly ModelOption[];
  /** The chosen model (controlled). */
  value?: string;
  /** The model at first (uncontrolled). @default the first model */
  defaultValue?: string;
  onValueChange?: (value: string, details: ChangeDetails<SelectValueReason>) => void;
  /** Submitted with a form, as Select's hidden native `<select>`. */
  name?: string;
  disabled?: boolean;
  labels?: Partial<ModelSelectorLabels>;
  className?: string;
}

export function ModelSelector({
  models,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  labels: labelsProp,
  className,
}: ModelSelectorProps): JSX.Element {
  const labels = useLabels('modelSelector', labelsProp);
  // Held here, not in Select: the trigger shows the chosen model's name, while Select's own value
  // would repeat the whole option, its description too.
  const [own, setOwn] = useState(defaultValue ?? models[0]?.value ?? null);
  const current = value === undefined ? own : value;
  const chosen = models.find((model) => model.value === current);
  // a hidden label, not aria-label: the trigger's name is then "Balanced Model", its visible text
  // included (WCAG 2.5.3, Label in Name)
  const labelId = useId();
  return (
    <div className={cx('nz-model-selector', className)} data-slot="model-selector">
      <span className="nz-visually-hidden" id={labelId}>
        {labels?.label ?? 'Model'}
      </span>
      <Select.Root
        value={current}
        {...(name === undefined ? {} : { name })}
        {...(disabled === undefined ? {} : { disabled })}
        onValueChange={(next, details) => {
          if (next === null) return;
          setOwn(next);
          onValueChange?.(next, details);
        }}
        aria-labelledby={labelId}
        size="sm"
      >
        <Select.Trigger
          // the Select names its trigger select-trigger; this one is the selector's
          render={(props) => (
            <button
              {...props}
              type="button"
              className={cx('nz-model-selector-trigger', classOf(props))}
              data-slot="model-selector-trigger"
            />
          )}
          leadingIcon={<SparklesGlyph />}
          indicator={
            <span className="nz-model-selector-chevron">
              <ChevronGlyph />
            </span>
          }
        >
          {/* Select's Value, which the trigger's name points at, showing the name alone */}
          <Select.Value
            render={(props) => (
              <span
                {...props}
                className={cx('nz-model-selector-value', classOf(props))}
                data-slot="model-selector-value"
              >
                {chosen?.label}
              </span>
            )}
          />
        </Select.Trigger>
        <Select.Popup className="nz-model-selector-popup" align="end">
          {models.map((model) => (
            <Select.Item
              key={model.value}
              render={(props) => (
                <div
                  {...props}
                  className={cx('nz-model-selector-item', classOf(props))}
                  data-slot="model-selector-item"
                />
              )}
              value={model.value}
              textValue={model.label}
              {...(model.disabled === undefined ? {} : { disabled: model.disabled })}
            >
              <span className="nz-model-selector-text">
                <span className="nz-model-selector-name">{model.label}</span>
                {model.description !== undefined && (
                  <span className="nz-model-selector-description">{model.description}</span>
                )}
              </span>
            </Select.Item>
          ))}
        </Select.Popup>
      </Select.Root>
    </div>
  );
}

function classOf(props: Record<string, unknown>): string | undefined {
  return typeof props['className'] === 'string' ? props['className'] : undefined;
}
