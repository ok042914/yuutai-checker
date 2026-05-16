'use client'

import { useState } from 'react'
import StockCard, { StockCardData } from './StockCard'


interface Props {
  stocks: StockCardData[]
}

export default function CategoryBrowser({ stocks }: Props) {
  const [highYieldOnly, setHighYieldOnly] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const MONTHS = [
    { id: 'all',   label: '全月' },
    { id: '1月20日', label: '1/20' },
    { id: '1月末',  label: '1月末' },
    { id: '2月20日', label: '2/20' },
    { id: '2月末',  label: '2月末' },
    { id: '3月20日', label: '3/20' },
    { id: '3月末',  label: '3月末' },
    { id: '4月末',  label: '4月末' },
    { id: '5月末',  label: '5月末' },
    { id: '6月末',  label: '6月末' },
    { id: '7月末',  label: '7月末' },
    { id: '8月末',  label: '8月末' },
    { id: '9月20日', label: '9/20' },
    { id: '9月末',  label: '9月末' },
    { id: '10月末', label: '10月末' },
    { id: '11月末', label: '11月末' },
    { id: '12月末', label: '12月末' },
    { id: 'その他', label: 'その他' },
  ]

  const query = searchQuery.trim().normalize('NFKC').toLowerCase()

  const nameMatch = (stored: string, q: string) => {
    const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\.{3}|…$/g, '')
    const s = norm(stored)
    return s.includes(q) || q.includes(s)
  }

  const filtered = query
    ? stocks.filter(s =>
        nameMatch(s.name, query) ||
        s.code.includes(query) ||
        (s.summary ?? '').toLowerCase().includes(query)
      )
    : stocks
        .filter(s => selectedMonth === 'all' || s.kakutei_month === selectedMonth)
        .filter(s => {
          if (!highYieldOnly) return true
          const total = (s.yuutai_yield ?? 0) + (s.dividend_yield ?? 0)
          return total >= 5
        })

  return (
    <>
      {/* 検索ボックス */}
      <div className="mb-6 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="銘柄名・証券コード・優待内容で検索"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >×</button>
        )}
      </div>

      {/* 権利月フィルター */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">権利確定月</h2>
        <div className="flex gap-2 flex-wrap">
          {MONTHS.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMonth(m.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedMonth === m.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* 銘柄一覧 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            全銘柄
            <span className="ml-2 font-normal text-gray-400">{filtered.length}件</span>
          </h2>
          <button
            onClick={() => setHighYieldOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              highYieldOnly
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-500 border-gray-300 hover:border-green-400'
            }`}
          >
            <span className={`w-3 h-3 rounded-full border-2 ${highYieldOnly ? 'bg-white border-white' : 'bg-gray-300 border-gray-300'}`} />
            合算利回り5%以上
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>条件に合う銘柄が見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(stock => (
              <StockCard key={stock.code} stock={stock} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
