import { useCallback, useEffect, useRef, useState } from 'react'
import { DocInfo, deleteDocument, getDocuments, trainDocs } from '../api'

export default function Train() {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [indexed, setIndexed] = useState<DocInfo[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ chunks: number; skipped: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    setDocsLoading(true)
    setDocsError(null)
    try {
      const r = await getDocuments()
      setIndexed(r.documents)
    } catch {
      setDocsError('Could not load indexed documents. Is the backend running?')
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => { loadDocuments() }, [])

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const pdfs = Array.from(incoming).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...pdfs.filter(f => !names.has(f.name))]
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.name !== name))

  const handleUpload = async () => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const result = await trainDocs(files)
      const skipped = result.documents
        .filter(d => d.note)
        .map(d => d.filename)
      setLastResult({ chunks: result.total_chunks, skipped })
      setFiles([])
      await loadDocuments()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (filename: string) => {
    setError(null)
    try {
      await deleteDocument(filename)
      await loadDocuments()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2 className="view-title">Train</h2>
        <p className="view-subtitle">Upload PDF documents to index into the knowledge base.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`dropzone ${dragging ? 'dropzone--over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <div className="dropzone-icon">⬆</div>
        <p className="dropzone-label">Drop PDFs here or click to browse</p>
        <p className="dropzone-hint">Only .pdf files — max 50 MB each</p>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map(f => (
            <div key={f.name} className="file-item">
              <span className="file-icon">📄</span>
              <span className="file-name">{f.name}</span>
              <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
              <button className="file-remove" onClick={() => removeFile(f.name)}>✕</button>
            </div>
          ))}
          <div className="file-actions">
            <button className="btn btn--ghost" onClick={() => setFiles([])}>Clear all</button>
            <button className="btn btn--primary" onClick={handleUpload} disabled={loading}>
              {loading ? 'Indexing…' : `Index ${files.length} file${files.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}

      {lastResult && (
        <div className="alert alert--success">
          {lastResult.chunks > 0
            ? `Indexed successfully — ${lastResult.chunks} chunks added.`
            : 'Upload complete.'}
          {lastResult.skipped.length > 0 && (
            <span className="alert-note">
              {' '}Already indexed (skipped): {lastResult.skipped.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Indexed documents */}
      <div className="section">
        <h3 className="section-title">
          Indexed Documents{!docsLoading && ` (${indexed.length})`}
        </h3>

        {docsLoading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading documents…</span>
          </div>
        )}

        {docsError && (
          <div className="alert alert--error">
            {docsError}
            <button className="btn-retry" onClick={loadDocuments}>Retry</button>
          </div>
        )}

        {!docsLoading && !docsError && indexed.length > 0 && (
          <div className="doc-table">
            <div className="doc-table-head">
              <span>Filename</span>
              <span>Pages</span>
              <span>Chunks</span>
              <span></span>
            </div>
            {indexed.map((doc, i) => (
              <div key={i} className="doc-table-row">
                <span className="doc-filename">{doc.filename}</span>
                <span>{doc.pages}</span>
                <span>{doc.chunks}</span>
                <button
                  className="btn-delete"
                  title="Remove from index"
                  onClick={() => handleDelete(doc.filename)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!docsLoading && !docsError && indexed.length === 0 && (
          <div className="empty-state">No documents indexed yet. Upload PDFs above to get started.</div>
        )}
      </div>
    </div>
  )
}
