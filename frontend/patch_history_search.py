content = open('src/pages/DataSourcesPage/DataSourcesPage.tsx').read()

# Add search state after expandedJob state
old = "  const [uploadError, setUploadError]   = useState('');"
new = "  const [uploadError, setUploadError]   = useState('');\n  const [historySearch, setHistorySearch] = useState('');"
content = content.replace(old, new)

# Add search filter before job list render
old = "        {jobsLoading ? ("
new = """        {/* Search and filter */}
        {jobs.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <input
              type="text"
              placeholder="Search uploads..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <svg
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        )}
        {jobsLoading ? ("""
content = content.replace(old, new)

# Filter jobs by search when rendering
old = "          <div className={styles.jobList}>\n            {jobs.map(job => {"
new = """          <div className={styles.jobList}>
            {jobs
              .filter(job =>
                !historySearch.trim() ||
                job.job_name.toLowerCase().includes(historySearch.toLowerCase()) ||
                (job.file_name ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
                job.source_name.toLowerCase().includes(historySearch.toLowerCase())
              )
              .map(job => {"""
content = content.replace(old, new)

open('src/pages/DataSourcesPage/DataSourcesPage.tsx', 'w').write(content)
print('Done')
