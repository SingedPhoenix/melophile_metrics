type StatusPanelVariant = 'loading' | 'empty' | 'error';

type StatusPanelProps = {
  action?: {
    label: string;
    onClick: () => void;
  };
  detail?: string;
  title: string;
  variant?: StatusPanelVariant;
};

function StatusPanel({ action, detail, title, variant = 'empty' }: StatusPanelProps) {
  return (
    <section className={`status-panel ${variant}`} aria-live={variant === 'loading' ? 'polite' : undefined}>
      <span className="status-panel-kicker">{labelForVariant(variant)}</span>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}

function labelForVariant(variant: StatusPanelVariant) {
  if (variant === 'loading') return 'loading';
  if (variant === 'error') return 'needs attention';
  return 'empty';
}

export default StatusPanel;
