import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  Clock, Trash2, RefreshCw, Database,
  AlertCircle, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import client from '../../api/client';
import { formatNumber } from '../../utils/formatters';
import styles from './DataSourcesPage.module.css';

interface IngestionJob {
  id: number;
  job_name: string;
  source_name: string;
  file_name: string | null;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  total_rows: number | null;
  inserted: number | null;
  updated: number | null;
  skipped: number | null;
  error_msg: string | null;
  created_at: string;
  completed_at: string | null;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
}

const STATUS_CONFIG = {
  complete:   { color: '#10B981', icon: CheckCircle2, label: 'Complete'   },
  failed:     { color: '#F87171', icon: XCircle,      label: 'Failed'     },
  processing: { color: '#F59E0B', icon: Loader2,      label: 'Processing' },
  pending:    { color: '#6B7280', icon: Clock,         label: 'Pending'    },
};

export default function DataSourcesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobName, setJobName]               = useState('');
  const [dragOver, setDragOver]             = useState(false);
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);
  const [expandedJob, setExpandedJob]       = useState<number | null>(null);
  const [uploadError, setUploadError]       = useState('');
  const [historySearch, setHistorySearch]   = useState('');
  const [previewData, setPreviewData]       = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading, refetch } = useQuery<IngestionJob[]>({
    queryKey: ['ingestion-jobs'],
    queryFn: async () => (await client.get('/ingestion/jobs')).data,
    refetchInterval: 10000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_name', name);
      const res = await client.post('/ingestion/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as IngestionJob;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['overview-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['source-stats'] });
      setSelectedFile(null);
      setJobName('');
      setUploadError('');
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Upload failed';
      setUploadError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: number) => client.delete(`/ingestion/jobs/${jobId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['overview-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['source-stats'] });
    },
  });

  const generatePreview = useCallback((file: File) => {
    setPreviewLoading(true);
    setPreviewData(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        if (allRows.length > 0) {
          const headers = (allRows[0] as unknown[]).map(h => String(h ?? ''));
          const dataRows = allRows.slice(1, 11).map(row =>
            (row as unknown[]).map(cell => {
              if (cell instanceof Date) return cell.toLocaleDateString('en-AU');
              return String(cell ?? '');
            })
          );
          setPreviewData({ headers, rows: dataRows });
        }
      } catch {
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const allowed = ['.xlsx', '.xls', '.xlsm', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`Unsupported file type. Allowed: ${allowed.join(', ')}`);
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    if (!jobName.trim()) {
      setJobName(file.name.replace(/\.[^/.]+$/, ''));
    }
    generatePreview(file);
  }, [jobName, generatePreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSubmit = () => {
    if (!selectedFile) { setUploadError('Please select a file'); return; }
    if (!jobName.trim()) { setUploadError('Please enter a name for this upload'); return; }
    setUploadError('');
    uploadMutation.mutate({ file: selectedFile, name: jobName.trim() });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const totalInserted = jobs
    .filter(j => j.status === 'complete')
    .reduce((s, j) => s + (j.inserted ?? 0), 0);

  const filteredJobs = jobs.filter(job =>
    !historySearch.trim() ||
    job.job_name.toLowerCase().includes(historySearch.toLowerCase()) ||
    (job.file_name ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
    job.source_name.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Data Sources</h2>
          <p className={styles.headingSub}>Upload Tender Excel or CSV Files from Government Portals</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <span className={styles.headerStatValue}>{jobs.length}</span>
            <span className={styles.headerStatLabel}>Total Uploads</span>
          </div>
          <div className={styles.headerStatDivider} />
          <div className={styles.headerStat}>
            <span className={styles.headerStatValue}>{formatNumber(totalInserted)}</span>
            <span className={styles.headerStatLabel}>Records Imported</span>
          </div>
        </div>
      </div>

      {/* ── Upload card ── */}
      <motion.div
        className={styles.uploadCard}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.uploadCardHeader}>
          <div className={styles.uploadCardIcon}>
            <Upload size={18} />
          </div>
          <div>
            <p className={styles.uploadCardTitle}>Upload Tender File</p>
            <p className={styles.uploadCardSub}>
              Supports Excel (.xlsx, .xls) and CSV files from any government portal
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''} ${selectedFile ? styles.dropZoneHasFile : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {selectedFile ? (
            <div className={styles.selectedFile}>
              <FileSpreadsheet size={24} className={styles.fileIcon} />
              <div>
                <p className={styles.fileName}>{selectedFile.name}</p>
                <p className={styles.fileSize}>
                  {(selectedFile.size / 1024).toFixed(1)} KB — ready to upload
                </p>
              </div>
              <button
                className={styles.clearFileBtn}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setPreviewData(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <XCircle size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.dropZoneContent}>
              <Upload size={28} className={styles.dropIcon} />
              <p className={styles.dropTitle}>Drop your file here or click to browse</p>
              <p className={styles.dropSub}>Excel (.xlsx, .xls) or CSV — max 10MB</p>
            </div>
          )}
        </div>

        {/* Preview loading */}
        {previewLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--text-dim)', fontSize: 12 }}>
            <Loader2 size={13} className={styles.spinning} />
            Reading file preview…
          </div>
        )}

        {/* Preview table */}
        {previewData && !previewLoading && (
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <p className={styles.previewTitle}>
                Preview — {previewData.rows.length} rows · {previewData.headers.length} columns
              </p>
              <button className={styles.previewHideBtn} onClick={() => setPreviewData(null)}>
                Hide
              </button>
            </div>
            <div className={styles.previewTableWrap}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className={styles.previewTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, ri) => (
                    <tr key={ri} className={styles.previewTr}>
                      {previewData.headers.map((_, ci) => (
                        <td key={ci} className={styles.previewTd}>{row[ci] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Job name input */}
        <div className={styles.formRow}>
          <label className={styles.formLabel}>
            Upload Name <span className={styles.required}>*</span>
          </label>
          <input
            className={styles.formInput}
            type="text"
            placeholder="e.g. VIC Tenders May 2026"
            value={jobName}
            onChange={e => setJobName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <p className={styles.formHint}>
            This name identifies the upload in your dashboard and as a data source
          </p>
        </div>

        {/* Error */}
        {uploadError && (
          <div className={styles.errorBanner}>
            <AlertCircle size={14} />
            {uploadError}
          </div>
        )}

        {/* Submit */}
        <button
          className={styles.uploadBtn}
          onClick={handleSubmit}
          disabled={uploadMutation.isPending || !selectedFile}
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 size={15} className={styles.spinning} />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={15} />
              Upload & Import
            </>
          )}
        </button>

        {/* Success banner */}
        <AnimatePresence>
          {uploadMutation.isSuccess && (
            <motion.div
              className={styles.successBanner}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CheckCircle2 size={14} />
              {uploadMutation.data?.inserted ?? 0} tenders imported successfully
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Job history ── */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div className={styles.historyTitle}>
            <Database size={15} />
            <span>Uploaded History</span>
            <span className={styles.jobCount}>{jobs.length}</span>
          </div>
          <button className={styles.refreshBtn} onClick={() => void refetch()}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Search */}
        {jobs.length > 0 && (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search uploads..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className={styles.formInput}
              style={{ paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
            />
            <svg
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        )}

        {jobsLoading ? (
          <div className={styles.loadingList}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.shimmer} style={{ width: 32, height: 32, borderRadius: 8 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className={styles.shimmer} style={{ height: 14, width: '40%' }} />
                  <div className={styles.shimmer} style={{ height: 11, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.emptyHistory}>
            <FileSpreadsheet size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No uploads yet</p>
            <p className={styles.emptySub}>Upload your first tender file above</p>
          </div>
        ) : (
          <div className={styles.jobList}>
            {filteredJobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedJob === job.id;
              return (
                <motion.div
                  key={job.id}
                  className={styles.jobCard}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.jobCardMain}>
                    <div
                      className={styles.jobStatusIcon}
                      style={{ background: cfg.color + '20', border: `1px solid ${cfg.color}44` }}
                    >
                      <cfg.icon
                        size={14}
                        style={{
                          color: cfg.color,
                          animation: job.status === 'processing' ? 'spin 1s linear infinite' : 'none',
                        }}
                      />
                    </div>
                    <div className={styles.jobInfo}>
                      <div className={styles.jobNameRow}>
                        <span className={styles.jobName}>{job.job_name}</span>
                        <span
                          className={styles.jobStatusPill}
                          style={{
                            background: cfg.color + '18',
                            color: cfg.color,
                            border: `1px solid ${cfg.color}33`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className={styles.jobMeta}>
                        <span>{job.file_name}</span>
                        <span className={styles.jobMetaDot}>·</span>
                        <span>{formatDate(job.created_at)}</span>
                        {job.status === 'complete' && (
                          <>
                            <span className={styles.jobMetaDot}>·</span>
                            <span style={{ color: '#10B981' }}>
                              {formatNumber(job.inserted ?? 0)} inserted
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.jobActions}>
                      <button
                        className={styles.jobActionBtn}
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        title="Details"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        className={styles.jobDeleteBtn}
                        onClick={() => {
                          if (confirm(`Delete "${job.job_name}" and all its tenders?`)) {
                            deleteMutation.mutate(job.id);
                          }
                        }}
                        title="Delete"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className={styles.jobDetails}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className={styles.jobDetailGrid}>
                          <div className={styles.jobDetailItem}>
                            <span className={styles.jobDetailLabel}>Source Name</span>
                            <span className={styles.jobDetailValue}>{job.source_name}</span>
                          </div>
                          <div className={styles.jobDetailItem}>
                            <span className={styles.jobDetailLabel}>Total Rows</span>
                            <span className={styles.jobDetailValue}>{formatNumber(job.total_rows ?? 0)}</span>
                          </div>
                          <div className={styles.jobDetailItem}>
                            <span className={styles.jobDetailLabel}>Inserted</span>
                            <span className={styles.jobDetailValue} style={{ color: '#10B981' }}>
                              {formatNumber(job.inserted ?? 0)}
                            </span>
                          </div>
                          <div className={styles.jobDetailItem}>
                            <span className={styles.jobDetailLabel}>Updated</span>
                            <span className={styles.jobDetailValue} style={{ color: '#F59E0B' }}>
                              {formatNumber(job.updated ?? 0)}
                            </span>
                          </div>
                          <div className={styles.jobDetailItem}>
                            <span className={styles.jobDetailLabel}>Skipped</span>
                            <span className={styles.jobDetailValue} style={{ color: '#6B7280' }}>
                              {formatNumber(job.skipped ?? 0)}
                            </span>
                          </div>
                          {job.completed_at && (
                            <div className={styles.jobDetailItem}>
                              <span className={styles.jobDetailLabel}>Completed</span>
                              <span className={styles.jobDetailValue}>{formatDate(job.completed_at)}</span>
                            </div>
                          )}
                        </div>
                        {job.error_msg && (
                          <div className={styles.jobWarning}>
                            <AlertCircle size={12} />
                            {job.error_msg}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
