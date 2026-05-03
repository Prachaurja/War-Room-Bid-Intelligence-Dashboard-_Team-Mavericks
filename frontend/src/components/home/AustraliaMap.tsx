import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from '../../pages/HomePage/HomePage.module.css';

// ── Types ─────────────────────────────────────────────────────
export interface StateStat {
  state:       string;
  count:       number;
  total_value: number;
}

// ── State metadata ─────────────────────────────────────────────
const STATE_META: Record<string, { name: string; color: string }> = {
  WA:  { name: 'Western Australia',             color: '#EC4899' },
  NT:  { name: 'Northern Territory',            color: '#06B6D4' },
  SA:  { name: 'South Australia',               color: '#10B981' },
  QLD: { name: 'Queensland',                    color: '#F59E0B' },
  NSW: { name: 'New South Wales',               color: '#3B82F6' },
  VIC: { name: 'Victoria',                      color: '#8B5CF6' },
  TAS: { name: 'Tasmania',                      color: '#84CC16' },
  ACT: { name: 'Australian Capital Territory',  color: '#F97316' },
};

// ── Accurate D3 Mercator projected paths
// Centre: 133.5°E 27.8°S, Scale: 780, ViewBox: 0 0 800 640
// Generated from detailed ABS-aligned coordinate arrays
const STATE_PATHS: Record<string, string> = {
  WA:  'M 119.83,428.13 L 134.54,416.68 L 148.15,408.45 L 157.68,401.9 L 157.68,367.98 L 142.7,336.37 L 136.58,291.94 L 127.73,252.48 L 135.9,215.42 L 148.15,208.26 L 161.76,199.68 L 182.18,203.89 L 195.8,198.52 L 216.22,190.83 L 238.0,176.7 L 246.71,161.5 L 254.61,158.64 L 261.82,153.51 L 270.67,141.99 L 277.48,133.35 L 284.28,124.45 L 297.9,110.66 L 309.61,105.75 L 318.32,109.39 L 329.21,117.26 L 338.74,120.64 L 338.74,282.52 L 338.74,328.57 L 338.74,407.96 L 325.13,407.96 L 270.67,407.96 L 216.22,411.74 L 161.76,421.65 L 119.83,428.13 Z',
  NT:  'M 338.74,120.64 L 352.35,109.53 L 365.97,101.12 L 379.58,93.57 L 393.19,84.5 L 406.81,80.74 L 420.42,81.72 L 434.03,87.29 L 443.43,103.64 L 440.84,108.27 L 431.31,121.91 L 434.03,136.46 L 445.06,131.79 L 447.65,125.15 L 458.81,132.07 L 461.26,143.55 L 461.26,282.52 L 338.74,282.52 Z',
  SA:  'M 338.74,282.52 L 461.26,282.52 L 502.1,282.52 L 502.1,328.57 L 502.1,408.45 L 501.69,476.82 L 488.49,472.33 L 481.68,467.18 L 468.07,472.33 L 454.45,437.15 L 440.84,427.46 L 429.95,424.14 L 420.42,416.52 L 413.61,392.28 L 400.0,379.52 L 387.61,375.82 L 379.44,367.82 L 365.97,360.01 L 352.35,350.51 L 338.74,328.57 Z',
  QLD: 'M 461.26,282.52 L 502.1,282.52 L 502.1,328.57 L 611.01,328.57 L 624.62,322.36 L 651.85,315.4 L 672.27,313.08 L 673.63,305.39 L 674.04,267.44 L 668.19,252.48 L 658.66,222.9 L 638.24,186.5 L 624.62,164.93 L 604.2,115.29 L 583.78,87.29 L 563.36,62.0 L 522.93,62.27 L 515.72,66.43 L 502.1,94.27 L 488.49,122.33 L 481.68,136.46 L 473.51,152.08 L 461.26,157.79 Z',
  NSW: 'M 502.1,328.57 L 611.01,328.57 L 624.62,322.36 L 651.85,315.4 L 672.27,313.08 L 673.63,336.37 L 665.46,360.01 L 651.85,384.03 L 642.32,407.79 L 638.24,400.26 L 636.88,424.97 L 627.35,441.69 L 624.22,467.18 L 616.46,467.18 L 604.2,467.18 L 590.59,467.18 L 576.98,475.79 L 563.36,475.79 L 556.56,472.33 L 542.94,472.33 L 529.33,479.25 L 515.72,484.45 L 502.1,477.0 L 502.1,408.45 Z',
  VIC: 'M 502.1,408.45 L 502.1,477.0 L 515.72,484.45 L 529.33,479.25 L 542.94,472.33 L 556.56,472.33 L 563.36,475.79 L 576.98,475.79 L 590.59,467.18 L 604.2,467.18 L 616.46,467.18 L 624.22,467.18 L 617.82,484.45 L 604.2,484.45 L 583.78,493.18 L 570.17,496.69 L 556.56,493.18 L 542.94,484.45 L 529.33,493.18 L 515.72,495.81 L 508.91,490.56 Z',
  TAS: 'M 556.56,524.77 L 570.17,519.74 L 583.78,519.74 L 597.4,525.13 L 604.2,537.78 L 601.48,556.1 L 597.4,565.37 L 583.78,576.59 L 570.17,576.59 L 556.56,565.37 L 549.75,556.1 L 549.75,537.78 Z',
  ACT: 'M 608.29,426.96 L 616.46,426.96 L 616.46,440.34 L 608.29,440.34 Z',
};

// ── Label positions ────────────────────────────────────────────
const STATE_LABELS: Record<string, { x: number; y: number }> = {
  WA:  { x: 215, y: 300 },
  NT:  { x: 395, y: 210 },
  SA:  { x: 415, y: 385 },
  QLD: { x: 560, y: 205 },
  NSW: { x: 595, y: 385 },
  VIC: { x: 560, y: 458 },
  TAS: { x: 578, y: 550 },
  ACT: { x: 622, y: 433 },
};

// ── Full name → abbreviation normaliser ───────────────────────
const FULL_NAME_MAP: Record<string, string> = {
  'WESTERN AUSTRALIA': 'WA', 'NORTHERN TERRITORY': 'NT',
  'SOUTH AUSTRALIA': 'SA', 'QUEENSLAND': 'QLD',
  'NEW SOUTH WALES': 'NSW', 'VICTORIA': 'VIC',
  'TASMANIA': 'TAS', 'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  'WA': 'WA', 'NT': 'NT', 'SA': 'SA', 'QLD': 'QLD',
  'NSW': 'NSW', 'VIC': 'VIC', 'TAS': 'TAS', 'ACT': 'ACT',
};

// ── Component ─────────────────────────────────────────────────
interface Props {
  stateStats: StateStat[];
  isLoading:  boolean;
}

export default function AustraliaMap({ stateStats, isLoading }: Props) {
  const [hoveredState,  setHoveredState]  = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [tooltipPos,    setTooltipPos]    = useState<{ x: number; y: number } | null>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();

  const statsMap = useMemo(() => {
    const m: Record<string, StateStat> = {};
    stateStats.forEach(s => {
      const raw = s.state?.toUpperCase().trim() ?? '';
      const key = FULL_NAME_MAP[raw];
      if (key) m[key] = s;
    });
    return m;
  }, [stateStats]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(statsMap).map(s => s.count), 1),
    [statsMap],
  );

  const handleMouseMove = (stateKey: string, e: React.MouseEvent<SVGPathElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHoveredState(stateKey);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
    setTooltipPos(null);
  };

  const handleStateClick = (key: string) => {
    setSelectedState(prev => prev === key ? null : key);
  };

  return (
    <div className={styles.mapContainer}>

      {/* ── SVG Map ── */}
      <div className={styles.mapSvgWrap} aria-busy={isLoading}>
        <svg
          ref={svgRef}
          viewBox="0 0 800 640"
          className={styles.mapSvg}
          style={{ overflow: 'visible' }}
        >
          <defs>
            {Object.entries(STATE_META).map(([key, meta]) => (
              <filter key={key} id={`glow-${key}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feFlood floodColor={meta.color} floodOpacity="0.85" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Intelligence grid */}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 52} x2="800" y2={i * 52}
              stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 52} y1="0" x2={i * 52} y2="640"
              stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
          ))}

          {/* Ocean labels */}
          <text x="62" y="580" fontSize="10" fill="rgba(99,102,241,0.28)"
            fontStyle="italic" letterSpacing="2">INDIAN OCEAN</text>
          <text x="720" y="300" fontSize="10" fill="rgba(99,102,241,0.28)"
            fontStyle="italic" letterSpacing="2"
            transform="rotate(90,720,300)">PACIFIC OCEAN</text>
          <text x="480" y="628" fontSize="10" fill="rgba(99,102,241,0.28)"
            fontStyle="italic" letterSpacing="2">SOUTHERN OCEAN</text>

          {/* State shapes */}
          {Object.entries(STATE_PATHS).map(([key, path]) => {
            const meta      = STATE_META[key];
            const stat      = statsMap[key];
            const count     = stat?.count ?? 0;
            const intensity = count / maxCount;
            const isHovered  = hoveredState  === key;
            const isSelected = selectedState === key;
            const labelPos  = STATE_LABELS[key];
            const isSmall   = key === 'ACT';

            return (
              <g key={key}>
                {/* Glow halo */}
                {(isSelected || isHovered) && (
                  <path
                    d={path}
                    fill={meta.color}
                    fillOpacity={isSelected ? 0.20 : 0.12}
                    stroke="none"
                    filter={`url(#glow-${key})`}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Main fill */}
                <path
                  d={path}
                  fill={meta.color}
                  fillOpacity={
                    isSelected ? 0.55
                    : isHovered  ? 0.42
                    : count > 0  ? 0.07 + intensity * 0.30
                    : 0.05
                  }
                  stroke={meta.color}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 1}
                  strokeOpacity={
                    isSelected ? 1
                    : isHovered  ? 0.9
                    : count > 0  ? 0.25 + intensity * 0.55
                    : 0.18
                  }
                  filter={isSelected ? 'url(#glow-selected)' : undefined}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill-opacity 0.2s, stroke-opacity 0.2s, stroke-width 0.15s',
                  }}
                  onMouseMove={e => handleMouseMove(key, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleStateClick(key)}
                />

                {/* Label */}
                {!isSmall && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    fontSize={key === 'TAS' ? 10 : 13}
                    fontWeight={isSelected || isHovered ? '700' : '600'}
                    fill={isSelected || isHovered ? meta.color : 'rgba(255,255,255,0.78)'}
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.2s' }}
                  >
                    {key}
                  </text>
                )}

                {/* Count */}
                {count > 0 && !isSmall && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y + 15}
                    textAnchor="middle"
                    fontSize={key === 'TAS' ? 8 : 10}
                    fill={meta.color}
                    opacity={isHovered || isSelected ? 1 : 0.8}
                    style={{ pointerEvents: 'none', userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatNumber(count)}
                  </text>
                )}

                {/* Pulsing dot */}
                {count > 0 && (
                  <motion.circle
                    cx={labelPos.x}
                    cy={isSmall ? labelPos.y : labelPos.y - 22}
                    r={isSelected ? 6 : isHovered ? 5.5 : 3.5 + intensity * 4}
                    fill={meta.color}
                    opacity={isSelected ? 1 : 0.65 + intensity * 0.35}
                    filter={`url(#glow-${key})`}
                    animate={
                      isSelected
                        ? { r: [4, 7, 4], opacity: [0.85, 1, 0.85] }
                        : intensity > 0.4
                          ? { opacity: [0.65, 1, 0.65] }
                          : {}
                    }
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Hover tooltip ── */}
        <AnimatePresence>
          {tooltipPos && hoveredState && (
            <motion.div
              className={styles.mapTooltip}
              style={{
                left: Math.min(tooltipPos.x + 16, 560),
                top:  Math.max(tooltipPos.y - 10, 4),
              }}
              initial={{ opacity: 0, scale: 0.93, y: 4 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{    opacity: 0, scale: 0.93, y: 4 }}
              transition={{ duration: 0.1 }}
            >
              {(() => {
                const meta = STATE_META[hoveredState];
                const stat = statsMap[hoveredState];
                return (
                  <>
                    <div className={styles.tooltipHeader}>
                      <span
                        className={styles.tooltipDot}
                        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                      />
                      <strong style={{ color: meta.color, fontSize: 13 }}>{meta.name}</strong>
                    </div>
                    <div className={styles.tooltipRows}>
                      <div className={styles.tooltipRow}>
                        <span>Total Tenders</span>
                        <strong>{stat ? formatNumber(stat.count) : 'No data'}</strong>
                      </div>
                      {stat?.total_value ? (
                        <div className={styles.tooltipRow}>
                          <span>Total Value</span>
                          <strong>{formatCurrency(stat.total_value)}</strong>
                        </div>
                      ) : null}
                    </div>
                    <p className={styles.tooltipCta}>
                      {stat?.count
                        ? 'Click to filter tenders →'
                        : 'No tenders for this state'}
                    </p>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── State selected info panel ── */}
      <AnimatePresence>
        {selectedState && (
          <motion.div
            className={styles.statePanel}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{    opacity: 0, x: 32 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div
              className={styles.statePanelHeader}
              style={{ borderBottomColor: STATE_META[selectedState]?.color + '30' }}
            >
              <div className={styles.statePanelTitle}>
                <span
                  className={styles.statePanelDot}
                  style={{
                    background: STATE_META[selectedState]?.color,
                    boxShadow:  `0 0 8px ${STATE_META[selectedState]?.color}`,
                  }}
                />
                <div>
                  <h3 style={{ color: STATE_META[selectedState]?.color, fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>
                    {STATE_META[selectedState]?.name}
                  </h3>
                  <p className={styles.statePanelSub}>
                    {statsMap[selectedState]
                      ? `${formatNumber(statsMap[selectedState].count)} Tenders · ${formatCurrency(statsMap[selectedState].total_value)}`
                      : 'No data available'}
                  </p>
                </div>
              </div>
              <button className={styles.statePanelClose} onClick={() => setSelectedState(null)}>
                <X size={14} />
              </button>
            </div>

            <div className={styles.statePanelList}>
              {!statsMap[selectedState] ? (
                <div className={styles.statePanelEmpty}>
                  <MapPin size={26} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
                  <p>No tender data for {selectedState}</p>
                </div>
              ) : (
                <div className={styles.statePanelStats}>
                  <div className={styles.statPanelStatItem}>
                    <span className={styles.statPanelStatIcon} style={{ background: STATE_META[selectedState]?.color + '20', color: STATE_META[selectedState]?.color }}>
                      <MapPin size={14} />
                    </span>
                    <div>
                      <p className={styles.statPanelStatLabel}>Total Tenders</p>
                      <p className={styles.statPanelStatValue} style={{ color: STATE_META[selectedState]?.color }}>
                        {formatNumber(statsMap[selectedState].count)}
                      </p>
                    </div>
                  </div>
                  <div className={styles.statPanelStatItem}>
                    <span className={styles.statPanelStatIcon} style={{ background: STATE_META[selectedState]?.color + '20', color: STATE_META[selectedState]?.color }}>
                      <DollarSign size={14} />
                    </span>
                    <div>
                      <p className={styles.statPanelStatLabel}>Total Value</p>
                      <p className={styles.statPanelStatValue} style={{ color: STATE_META[selectedState]?.color }}>
                        {formatCurrency(statsMap[selectedState].total_value)}
                      </p>
                    </div>
                  </div>
                  <button
                    className={styles.statePanelViewBtn}
                    style={{ background: STATE_META[selectedState]?.color + '18', borderColor: STATE_META[selectedState]?.color + '40', color: STATE_META[selectedState]?.color }}
                    onClick={() => navigate(`/tenders?state=${selectedState}&status=active`)}
                  >
                    View {selectedState} Tenders →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}