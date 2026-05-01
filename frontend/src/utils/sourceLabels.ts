const SOURCE_LABELS: Record<string, string> = {
  austender: 'AusTender',
  tendersnet: 'Tenders.Net',
  qld_tenders: 'QLD Tenders',
  nsw_etender: 'NSW eTender',
};

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  austender: 'Federal procurement feed',
  tendersnet: 'Commercial tender aggregation',
  qld_tenders: 'Queensland government tenders',
  nsw_etender: 'NSW eTendering feed',
};

export function getSourceLabel(sourceName: string): string {
  return SOURCE_LABELS[sourceName] ?? sourceName.replace(/_/g, ' ');
}

export function getSourceDescription(sourceName: string): string {
  return SOURCE_DESCRIPTIONS[sourceName] ?? 'Connected tender source';
}
