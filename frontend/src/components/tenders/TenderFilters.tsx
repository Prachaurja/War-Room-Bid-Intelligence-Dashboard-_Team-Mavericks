import { Search, X, SlidersHorizontal } from 'lucide-react';
import styles from './TenderFilters.module.css';

const SECTORS = [
  { value: '',                   label: 'All Sectors'         },
  { value: 'cleaning',           label: 'Cleaning'            },
  { value: 'construction',       label: 'Construction'        },
  { value: 'facility_management',label: 'Facility Management' },
  { value: 'it_services',        label: 'IT Services'         },
  { value: 'healthcare',         label: 'Healthcare'          },
  { value: 'transportation',     label: 'Transportation'      },
  { value: 'other',              label: 'Other'               },
];

const STATES = [
  { value: '',       label: 'All States' },
  { value: 'NSW',    label: 'NSW'        },
  { value: 'VIC',    label: 'VIC'        },
  { value: 'QLD',    label: 'QLD'        },
  { value: 'SA',     label: 'SA'         },
  { value: 'WA',     label: 'WA'         },
  { value: 'ACT',    label: 'ACT'        },
  { value: 'NT',     label: 'NT'         },
  { value: 'TAS',    label: 'TAS'        },
  { value: 'Federal',label: 'Federal'    },
];

interface TenderFiltersProps {
  search:        string;
  sector:        string;
  state:         string;
  onSearch:      (v: string) => void;
  onSector:      (v: string) => void;
  onState:       (v: string) => void;
  onClear:       () => void;
  totalResults:  number;
  loading:       boolean;
}

export default function TenderFilters({
  search, sector, state,
  onSearch, onSector, onState, onClear,
  totalResults, loading,
}: TenderFiltersProps) {
  const hasFilters = !!(search || sector || state);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.leftGroup}>
          <SlidersHorizontal size={14} className={styles.filterIcon} />
          <span className={styles.filterLabel}>Filters</span>
          {hasFilters && (
            <span className={styles.activeCount}>
              {[search, sector, state].filter(Boolean).length} active
            </span>
          )}
        </div>
        <div className={styles.rightGroup}>
          {loading ? (
            <span className={styles.loading}>Searching…</span>
          ) : (
            <span className={styles.results}>{totalResults.toLocaleString()} results</span>
          )}
          {hasFilters && (
            <button className={styles.clearBtn} onClick={onClear}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search title or agency…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearInput} onClick={() => onSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sector */}
        <select
          className={styles.select}
          value={sector}
          onChange={e => onSector(e.target.value)}
        >
          {SECTORS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* State */}
        <select
          className={styles.select}
          value={state}
          onChange={e => onState(e.target.value)}
        >
          {STATES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}