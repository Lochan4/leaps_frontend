import { useState } from 'react'
import Train from './components/Train'
import Search from './components/Search'

type Tab = 'train' | 'search'

export default function App() {
  const [tab, setTab] = useState<Tab>('train')

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">RAG System</span>
          </div>
          <nav className="tabs">
            <button
              className={`tab ${tab === 'train' ? 'tab--active' : ''}`}
              onClick={() => setTab('train')}
            >
              Train
            </button>
            <button
              className={`tab ${tab === 'search' ? 'tab--active' : ''}`}
              onClick={() => setTab('search')}
            >
              Search
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {tab === 'train' ? <Train /> : <Search />}
      </main>
    </div>
  )
}
