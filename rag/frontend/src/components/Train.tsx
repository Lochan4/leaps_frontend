import { useCallback, useEffect, useRef, useState } from 'react'
import { DocInfo, getDocuments, trainDocs } from '../api'

export default function Train() {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [indexed, setIndexed] = useState<DocInfo[]>([])
  const [lastResult, setLastResult] = useState<{ chunks: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDocuments()
      .then(r => setIndexed(r.documents))
      .catch(() => {})
  }, [])

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
      setIndexed(prev => [...prev, ...result.documents])
      setLastResult({ chunks: result.total_chunks })
      setFiles([])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
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
        <p className="dropzone-hint">Only .pdf files are supported</p>
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
          Indexed successfully — {lastResult.chunks} chunks added to the knowledge base.
        </div>
      )}

      {/* Indexed documents */}
      {indexed.length > 0 && (
        <div className="section">
          <h3 className="section-title">Indexed Documents ({indexed.length})</h3>
          <div className="doc-table">
            <div className="doc-table-head">
              <span>Filename</span>
              <span>Pages</span>
              <span>Chunks</span>
            </div>
            {indexed.map((doc, i) => (
              <div key={i} className="doc-table-row">
                <span className="doc-filename">{doc.filename}</span>
                <span>{doc.pages}</span>
                <span>{doc.chunks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {indexed.length === 0 && !loading && (
        <div className="empty-state">No documents indexed yet. Upload PDFs above to get started.</div>
      )}
    </div>
  )
}
