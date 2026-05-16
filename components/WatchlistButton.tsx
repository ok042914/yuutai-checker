'use client'

import { useState, useEffect } from 'react'

interface WatchlistButtonProps {
  code: string
  name: string
}

const WATCHLIST_KEY = 'yuutai_watchlist'

interface WatchlistItem {
  code: string
  name: string
  addedAt: string
  memo: string
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(WATCHLIST_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
}

export default function WatchlistButton({ code, name }: WatchlistButtonProps) {
  const [isWatched, setIsWatched] = useState(false)
  const [showMemoInput, setShowMemoInput] = useState(false)
  const [memo, setMemo] = useState('')

  useEffect(() => {
    const list = getWatchlist()
    const item = list.find(i => i.code === code)
    setIsWatched(!!item)
    if (item) setMemo(item.memo)
  }, [code])

  function handleAdd() {
    if (isWatched) {
      // 削除
      const list = getWatchlist().filter(i => i.code !== code)
      saveWatchlist(list)
      setIsWatched(false)
      setShowMemoInput(false)
    } else {
      setShowMemoInput(true)
    }
  }

  function handleSave() {
    const list = getWatchlist().filter(i => i.code !== code)
    list.push({
      code,
      name,
      addedAt: new Date().toISOString(),
      memo,
    })
    saveWatchlist(list)
    setIsWatched(true)
    setShowMemoInput(false)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAdd}
        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
          isWatched
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
      >
        {isWatched ? (
          <>
            <span>⭐</span>
            <span>ウォッチリスト登録済み（タップで削除）</span>
          </>
        ) : (
          <>
            <span>☆</span>
            <span>ウォッチリストに追加</span>
          </>
        )}
      </button>

      {showMemoInput && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <label className="text-xs text-gray-500 font-medium">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="気になる理由や検討メモを入力..."
            className="w-full text-sm border rounded p-2 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-lg font-medium hover:bg-blue-700"
            >
              追加する
            </button>
            <button
              onClick={() => setShowMemoInput(false)}
              className="flex-1 bg-white border text-gray-600 text-sm py-1.5 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
