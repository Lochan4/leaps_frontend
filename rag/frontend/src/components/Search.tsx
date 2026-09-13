import { useRef, useState } from 'react'
import { SearchResult, searchDocs } from '../api'

export default function Search() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await searchDocs(q, topK)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch()
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2 className="view-title">Search</h2>
        <p className="view-subtitle">Query the indexed knowledge base. Press ⌘↵ to search.</p>
      </div>

      <div className="search-box">
        <textarea
          ref={textareaRef}
          className="search-input"
          placeholder="Ask anything about the indexed documents…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
        />
        <div className="search-controls">
          <label className="topk-label">
            Top K
            <select
              className="topk-select"
              value={topK}
              onChange={e => setTopK(Number(e.target.value))}
            >
              {[3, 5, 8, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="btn btn--primary"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Retrieving and generating answer…</span>
        </div>
      )}

      {result && (
        <div className="results">
          {/* Answer */}
          <div className="answer-card">
            <div className="answer-label">Answer</div>
            <div className="answer-text">{result.answer}</div>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="sources">
              <h3 className="section-title">Sources ({result.sources.length})</h3>
              {result.sources.map((src, i) => (
                <div key={i} className="source-card">
                  <div className="source-meta">
                    <span className="source-file">{src.source}</span>
                    <span className="source-page">p. {src.page}</span>
                    <span className={`source-type source-type--${src.type}`}>{src.type}</span>
                    <span className="source-score">score {src.score}</span>
                  </div>
                  <p className="source-text">{src.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !result && !error && (
        <div className="empty-state">Enter a query above to search the knowledge base.</div>
      )}
    </div>
  )
}
