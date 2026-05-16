'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getWatchlist } from '@/components/WatchlistButton'

// デプロイ日時（更新確認用）
const DEPLOY_DATE = '2026-05-16 12:00'

interface WatchlistItem {
  code: string
  name: string
  addedAt: string
  memo: string
}

function daysSince(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  return `${days}日前に追加`
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [memoInput, setMemoInput] = useState('')

  useEffect(() => {
    setItems(getWatchlist())
  }, [])

  function handleRemove(code: string) {
    const list = items.filter(i => i.code !== code)
    localStorage.setItem('yuutai_watchlist', JSON.stringify(list))
    setItems(list)
  }

  function handleEditMemo(item: WatchlistItem) {
    setEditingCode(item.code)
    setMemoInput(item.memo)
  }

  function handleSaveMemo(code: string) {
    const list = items.map(i =>
      i.code === code ? { ...i, memo: memoInput } : i
    )
    localStorage.setItem('yuutai_watchlist', JSON.stringify(list))
    setItems(list)
    setEditingCode(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-lg">←</Link>
          <div>
            <h1 className="font-bold text-gray-900">ウォッチリスト</h1>
            <p className="text-xs text-gray-400">{items.length}銘柄登録中</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">☆</p>
            <p className="text-sm">ウォッチリストは空です</p>
            <p className="text-xs mt-2">銘柄詳細ページから追加してください</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              銘柄を探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.code}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    href={`/stock/${item.code}`}
                    className="flex-1 hover:text-blue-600"
                  >
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-xs text-gray-400">{item.code} / {daysSince(item.addedAt)}</p>
                  </Link>
                  <button
                    onClick={() => handleRemove(item.code)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg shrink-0"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>

                {editingCode === item.code ? (
                  <div className="space-y-2">
                    <textarea
                      value={memoInput}
                      onChange={e => setMemoInput(e.target.value)}
                      className="w-full text-xs border rounded p-2 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="メモを入力..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveMemo(item.code)}
                        className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-lg font-medium hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingCode(null)}
                        className="flex-1 bg-white border text-gray-600 text-xs py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleEditMemo(item)}
                    className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-100 min-h-[28px]"
                  >
                    {item.memo || <span className="text-gray-300">メモなし（タップで編集）</span>}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/stock/${item.code}`}
                    className="flex-1 text-center text-xs text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50"
                  >
                    詳細を見る
                  </Link>
                  <a
                    href={`https://finance.yahoo.co.jp/quote/${item.code}.T`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
                  >
                    Yahoo!ファイナンス
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="mt-12 border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <p>株主優待チェッカー</p>
        <p className="mt-1">更新日時: {DEPLOY_DATE}</p>
      </footer>
    </div>
  )
}
