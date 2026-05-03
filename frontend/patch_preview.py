content = open('src/pages/DataSourcesPage/DataSourcesPage.tsx').read()

# Add xlsx import at top
old = "import client from '../../api/client';"
new = "import client from '../../api/client';\nimport * as XLSX from 'xlsx';"
content = content.replace(old, new)

# Add preview state after historySearch state
old = "  const [historySearch, setHistorySearch] = useState('');"
new = """  const [historySearch, setHistorySearch] = useState('');
  const [previewData, setPreviewData]     = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);"""
content = content.replace(old, new)

# Update handleFileSelect to generate preview
old = """  const handleFileSelect = useCallback((file: File) => {
    const allowed = ['.xlsx', '.xls', '.xlsm', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`Unsupported file type. Allowed: ${allowed.join(', ')}`);
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    // Auto-fill job name from filename
    if (!jobName.trim()) {
      // Remove file extension only — preserve the original name as-is
      const name = file.name.replace(/\\.[^/.]+$/, '');
      setJobName(name);
    }
  }, [jobName]);"""

new = """  const handleFileSelect = useCallback((file: File) => {
    const allowed = ['.xlsx', '.xls', '.xlsm', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError(`Unsupported file type. Allowed: ${allowed.join(', ')}`);
      return;
    }
    setSelectedFile(file);
    setPreviewData(null);
    setUploadError('');
    // Auto-fill job name from filename
    if (!jobName.trim()) {
      const name = file.name.replace(/\\.[^/.]+$/, '');
      setJobName(name);
    }
    // Generate preview
    setPreviewLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
        if (rows.length > 0) {
          const headers = (rows[0] as string[]).map(h => String(h ?? ''));
          const dataRows = rows.slice(1, 11).map(row =>
            (row as string[]).map(cell => {
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
  }, [jobName]);"""

content = content.replace(old, new)

# Add preview section after the drop zone closing tag and before form row
old = "        {/* Job name input */}\n        <div className={styles.formRow}>"
new = """        {/* Preview table */}
        {previewLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--text-dim)', fontSize: 12 }}>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Reading file…
          </div>
        )}
        {previewData && !previewLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Preview — first {previewData.rows.length} rows of {previewData.headers.length} columns
              </p>
              <button
                onClick={() => setPreviewData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11 }}
              >
                Hide
              </button>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 400 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {previewData.headers.map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                        color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
                        whiteSpace: 'nowrap', letterSpacing: '0.03em', fontSize: 10.5,
                        textTransform: 'uppercase',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {previewData.headers.map((_, ci) => (
                        <td key={ci} style={{
                          padding: '7px 12px', color: 'var(--text-secondary)',
                          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Job name input */}
        <div className={styles.formRow}>"""

content = content.replace(old, new)

open('src/pages/DataSourcesPage/DataSourcesPage.tsx', 'w').write(content)
print('Done')
