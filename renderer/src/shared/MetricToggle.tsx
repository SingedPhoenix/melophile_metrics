export type MetricOption<T extends string> = {
  value: T;
  label: string;
};

type MetricToggleProps<T extends string> = {
  label: string;
  value: T;
  options: MetricOption<T>[];
  onChange: (value: T) => void;
};

function MetricToggle<T extends string>({ label, value, options, onChange }: MetricToggleProps<T>) {
  return (
    <div className="metric-toggle" aria-label={label}>
      {options.map(option => (
        <button
          className={option.value === value ? 'pill active' : 'pill'}
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default MetricToggle;
