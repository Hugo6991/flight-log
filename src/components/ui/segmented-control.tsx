import { useId } from "react";

type Props = {
  label: string;
  value: string;
  options: readonly {
    value: string;
    label: string;
    accessibleLabel?: string;
  }[];
  disabled?: boolean;
  onValueChange(value: string): void;
};

/** Native radio semantics provide one Tab stop and arrow-key selection. */
export function SegmentedControl({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: Props) {
  const name = useId();
  return (
    <fieldset className="ui-segmented" disabled={disabled}>
      <legend className="ui-sr-only">{label}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            aria-label={option.accessibleLabel ?? option.label}
            onChange={() => onValueChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
