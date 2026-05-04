import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import styles from './TenderFilters.module.css';

export type PageSize = '15' | '25' | '50' | '100';
export type YearMode = 'close' | 'published';

const SECTORS = [
  { value: '', label: 'All Sectors' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'construction', label: 'Construction' },
  { value: 'facility_management', label: 'Facility Management' },
  { value: 'it_services', label: 'IT Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other', label: 'Other' },
];

const STATES = [
  { value: '', label: 'All States' },
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'ACT', label: 'ACT' },
  { value: 'NT', label: 'NT' },
  { value: 'TAS', label: 'TAS' },
  { value: 'Federal', label: 'Federal' },
];

const PAGE_SIZES: Array<{ value: PageSize; label: string }> = [
  { value: '15', label: 'Show 15' },
  { value: '25', label: 'Show 25'},
  { value: '50', label: 'Show 50' },
  { value: '100', label: 'Show 100'},
];

const SOURCE_LABELS: Record<string, string> = {
  austender: 'AusTender',
  AusTender: 'AusTender',
  qtenders: 'QTenders',
  QTenders: 'QTenders',
  'NSW eTendering': 'NSW eTendering',
  nsw_etendering: 'NSW eTendering',
  BuyingForVictoria: 'Buying for Victoria',
  buying_for_victoria: 'Buying for Victoria',
  VendorPanel: 'VendorPanel',
  vendorpanel: 'VendorPanel',
};

const sourceLabel = (source: string) =>
  SOURCE_LABELS[source] ?? source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

interface TenderFiltersProps {
  search: string;
  sector: string;
  state: string;
  yearMode: YearMode;
  year: string;
  sourceName: string;
  pageSize: PageSize;
  yearOptions: string[];
  sourceOptions: string[];
  onSearch: (v: string) => void;
  onSector: (v: string) => void;
  onState: (v: string) => void;
  onYearMode: (v: YearMode) => void;
  onYear: (v: string) => void;
  onSource: (v: string) => void;
  onPageSize: (v: PageSize) => void;
  onClear: () => void;
  totalResults: number;
  loading: boolean;
}

export default function TenderFilters({
  search,
  sector,
  state,
  yearMode,
  year,
  sourceName,
  pageSize,
  yearOptions,
  sourceOptions,
  onSearch,
  onSector,
  onState,
  onYearMode,
  onYear,
  onSource,
  onPageSize,
  onClear,
  totalResults,
  loading,
}: TenderFiltersProps) {
  const activeFilters = [search, sector, state, year, sourceName].filter(Boolean);
  const hasFilters = activeFilters.length > 0;
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.primaryControls}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search title or agency..."
              value={search}
              onChange={(event) => onSearch(event.target.value)}
            />
            {search && (
              <button className={styles.clearInput} onClick={() => onSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <button
            className={styles.filterMenuBtn}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {hasFilters && <span className={styles.activeCount}>{activeFilters.length}</span>}
            <ChevronDown size={14} className={filtersOpen ? styles.chevronOpen : ''} />
          </button>
          <select
            className={styles.pageSizeSelect}
            value={pageSize}
            onChange={(event) => onPageSize(event.target.value as PageSize)}
            aria-label="Items per page"
          >
            {PAGE_SIZES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.rightGroup}>
          {loading ? (
            <span className={styles.loading}>Searching...</span>
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

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            className={styles.menuPanel}
            initial={{ maxHeight: 0, opacity: 0, scaleY: 0.96, y: -4 }}
            animate={{ maxHeight: 140, opacity: 1, scaleY: 1, y: 0 }}
            exit={{ maxHeight: 0, opacity: 0, scaleY: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <motion.div
              className={styles.controls}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              <select
                className={styles.select}
                value={sector}
                onChange={(event) => onSector(event.target.value)}
              >
                {SECTORS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={state}
                onChange={(event) => onState(event.target.value)}
              >
                {STATES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={yearMode}
                onChange={(event) => onYearMode(event.target.value as YearMode)}
              >
                <option value="close">Close Year</option>
                <option value="published">Published Year</option>
              </select>

              <select
                className={styles.select}
                value={year}
                onChange={(event) => onYear(event.target.value)}
              >
                <option value="">All Years</option>
                {yearOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={sourceName}
                onChange={(event) => onSource(event.target.value)}
              >
                <option value="">All Sources</option>
                {sourceOptions.map((item) => (
                  <option key={item} value={item}>{sourceLabel(item)}</option>
                ))}
              </select>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
