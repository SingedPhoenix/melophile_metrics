import type { KeyboardEvent, ReactNode } from 'react';

export type RankedBarListRow = {
  barLabel: string;
  key: string;
  meta?: ReactNode;
  onOpen?: () => void;
  rank: number;
  subtitle?: string;
  title: string;
  value: number;
};

type RankedBarListProps = {
  ariaLabel?: string;
  maxValue?: number;
  rows: RankedBarListRow[];
};

function RankedBarList({ ariaLabel, maxValue, rows }: RankedBarListProps) {
  const scaleMax = maxValue || Math.max(...rows.map(row => row.value), 1);

  return (
    <ol aria-label={ariaLabel} className="ranked-bar-list">
      {rows.map(row => {
        const width = Math.max(6, Math.round((row.value / scaleMax) * 100));
        const openProps = row.onOpen
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: row.onOpen,
              onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  row.onOpen?.();
                }
              }
            }
          : {};

        return (
          <li className={row.onOpen ? 'ranked-bar-row spotify-open-row' : 'ranked-bar-row'} key={row.key} {...openProps}>
            <span className="rank">#{row.rank}</span>
            <span className="ranked-title-block">
              <strong>{row.title}</strong>
              {row.subtitle && <small>{row.subtitle}</small>}
            </span>
            {row.meta && <span className="ranked-row-meta">{row.meta}</span>}
            <span className="ranked-bar-track">
              <span className="ranked-bar-fill" style={{ width: `${width}%` }}>
                <span>{row.barLabel}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default RankedBarList;
