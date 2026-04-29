content = open('src/pages/TendersPage/TendersPage.tsx').read()

old = '''              {/* Value */}
              <div className={styles.scValueRow}>
                <span className={styles.scValueLabel}>Total Value</span>
                <span className={styles.scValue} style={{ color: isActive ? card.color : 'var(--text-secondary)' }}>
                  {stats ? (value > 0 ? formatCurrency(value) : 'Not Disclosed') : '…'}
                </span>
              </div>'''

new = '''              {/* Value — source breakdown for active, total for others */}
              {card.id === 'active' ? (
                <div className={styles.scSourceBreakdown}>
                  {sourceStats
                    ? Object.entries(sourceStats)
                        .filter(([, statuses]) => 'open' in statuses || 'active' in statuses)
                        .map(([srcName, statuses]) => {
                          const d = statuses['open'] ?? statuses['active'] ?? { count: 0, value: 0 };
                          const label =
                            srcName === 'austender'   ? 'AusTender'   :
                            srcName === 'tendersnet'  ? 'Tenders.Net' :
                            srcName === 'qld_tenders' ? 'QLD Tenders' :
                            srcName.replace(/_/g, ' ');
                          return (
                            <div key={srcName} className={styles.scBreakdownRow}>
                              <span className={styles.scBreakdownSrc}>{label}</span>
                              <span className={styles.scBreakdownCount}>{formatNumber(d.count)} tenders</span>
                              <span className={styles.scBreakdownVal} style={{ color: card.color }}>
                                {d.value > 0 ? formatCurrency(d.value) : 'Not disclosed'}
                              </span>
                            </div>
                          );
                        })
                    : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</span>
                  }
                </div>
              ) : (
                <div className={styles.scValueRow}>
                  <span className={styles.scValueLabel}>Total Value</span>
                  <span className={styles.scValue} style={{ color: isActive ? card.color : 'var(--text-secondary)' }}>
                    {stats ? (value > 0 ? formatCurrency(value) : 'Not disclosed') : '…'}
                  </span>
                </div>
              )}'''

content = content.replace(old, new)
open('src/pages/TendersPage/TendersPage.tsx', 'w').write(content)
print('Done')
