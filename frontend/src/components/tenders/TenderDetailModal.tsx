import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, MapPin, DollarSign, Calendar,
  Tag, ExternalLink, FileText, Globe, Hash,
} from 'lucide-react';
import type { Tender } from '../../types/tender.types';
import { formatCurrencyFull, formatDate } from '../../utils/formatters';
import { sectorLabel, sectorColor } from '../../utils/tender.utils';
import styles from './TenderDetailModal.module.css';

interface Props {
  tender: Tender | null;
  onClose: () => void;
}

function Row({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        <Icon size={13} className={styles.rowIcon} />
        <span>{label}</span>
      </div>
      <p className={mono ? styles.rowValueMono : styles.rowValue}>{value}</p>
    </div>
  );
}

export default function TenderDetailModal({ tender, onClose }: Props) {
  if (!tender) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{   opacity: 0, y: 24, scale: 0.97  }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div
                className={styles.sectorDot}
                style={{ background: sectorColor(tender.sector) }}
              />
              <div>
                <p className={styles.headerSector}>{sectorLabel(tender.sector)}</p>
                <p className={styles.headerSource}>{tender.source_name} · {tender.source_id}</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{tender.title}</h2>
            <span className={styles[`status_${tender.status}`]}>{tender.status}</span>
          </div>

          {/* Description */}
          {tender.description && (
            <div className={styles.descSection}>
              <p className={styles.descLabel}>Description / Category</p>
              <p className={styles.desc}>{tender.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailsCol}>
              <p className={styles.colLabel}>Contract Details</p>
              <Row icon={Building2} label="Agency"         value={tender.agency} />
              <Row icon={DollarSign} label="Contract Value" value={tender.contract_value ? formatCurrencyFull(tender.contract_value) : '—'} />
              <Row icon={MapPin}     label="State"          value={tender.state ?? 'Federal'} />
              <Row icon={Tag}        label="Sector"         value={sectorLabel(tender.sector)} />
            </div>
            <div className={styles.detailsCol}>
              <p className={styles.colLabel}>Dates &amp; Source</p>
              <Row icon={Calendar}  label="Close Date"     value={formatDate(tender.close_date)} />
              <Row icon={Calendar}  label="Published"      value={formatDate(tender.published_date)} />
              <Row icon={Globe}     label="Source"         value={tender.source_name} />
              <Row icon={Hash}      label="Contract ID"    value={tender.source_id} mono />
            </div>
          </div>

          {/* Value highlight */}
          {tender.contract_value && (
            <div className={styles.valueBanner}>
              <span className={styles.valueBannerLabel}>Contract Value</span>
              <span className={styles.valueBannerAmount}>
                {formatCurrencyFull(tender.contract_value)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>Close</button>
            {tender.source_url && (
              <a
                href={tender.source_url}
                target="_blank"
                rel="noreferrer"
                className={styles.primaryBtn}
              >
                <ExternalLink size={14} />
                View on AusTender
              </a>
            )}
            <button className={styles.bidBtn}>
              <FileText size={14} />
              Submit Bid
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}