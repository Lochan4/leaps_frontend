export interface DocInfo {
  filename: string
  pages: number
  chunks: number
}

export interface TrainResult {
  status: string
  documents: DocInfo[]
  total_chunks: number
}

export interface Source {
  text: string
  source: string
  page: number
  score: number
  type: string
}

export interface SearchResult {
  answer: string
  sources: Source[]
}

export async function trainDocs(files: File[]): Promise<TrainResult> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch('/train', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Training failed')
  }
  return res.json()
}

export async function getDocuments(): Promise<{ documents: DocInfo[] }> {
  const res = await fetch('/train')
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function searchDocs(query: string, top_k = 5): Promise<SearchResult> {
  const res = await fetch('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Search failed')
  }
  return res.json()
}
