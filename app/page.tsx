import StockCard, { StockCardData } from '@/components/StockCard'
import Link from 'next/link'

// デプロイ日時（更新確認用）
const DEPLOY_DATE = '2026-05-16 12:00'

const CATEGORIES = [
  { id: 'food', label: '飲食・グルメ', icon: '🍽️' },
  { id: 'daily', label: '日常生活', icon: '🛒' },
  { id: 'travel', label: '旅行・宿泊', icon: '✈️' },
  { id: 'entertainment', label: 'エンタメ・レジャー', icon: '🎬' },
  { id: 'health', label: '医療・健康', icon: '🏥' },
  { id: 'fashion', label: 'ファッション・美容', icon: '👗' },
  { id: 'home', label: 'ホームセンター・DIY', icon: '🔧' },
  { id: 'books', label: '書籍・文具・教育', icon: '📚' },
  { id: 'pet', label: 'ペット', icon: '🐾' },
  { id: 'car', label: '車・移動', icon: '🚗' },
  { id: 'it', label: 'IT・通信', icon: '💻' },
  { id: 'finance', label: '金融・保険', icon: '🏦' },
]

// モックデータ（Supabase未接続時の表示用）
const MOCK_STOCKS: StockCardData[] = [
  {
    code: '7974',
    name: '任天堂',
    summary: '株主向けギフト（カタログ品）',
    yuutai_yield: 0.5,
    dividend_yield: 1.8,
    min_investment: 600000,
    risk_score: 10,
    risk_icon: '🟢',
    timing_signal: 'accumulate',
    timing_label: '閑散期（仕込み時）',
  },
  {
    code: '9843',
    name: 'ニトリホールディングス',
    summary: '自社商品割引券（10%OFF）',
    yuutai_yield: 0.3,
    dividend_yield: 0.8,
    min_investment: 180000,
    risk_score: 15,
    risk_icon: '🟢',
    timing_signal: 'watch',
    timing_label: '様子見',
  },
  {
    code: '8267',
    name: 'イオン',
    summary: 'オーナーズカード（3〜7%キャッシュバック）',
    yuutai_yield: 2.1,
    dividend_yield: 0.8,
    min_investment: 280000,
    risk_score: 25,
    risk_icon: '🟢',
    timing_signal: 'buy',
    timing_label: '権利落ち直後（狙い目）',
  },
  {
    code: '4755',
    name: '楽天グループ',
    summary: '楽天市場ポイント',
    yuutai_yield: 1.0,
    dividend_yield: 0.0,
    min_investment: 80000,
    risk_score: 65,
    risk_icon: '🔴',
    timing_signal: 'avoid',
    timing_label: '権利確定直前（割高注意）',
  },
  {
    code: '3382',
    name: 'セブン&アイ・ホールディングス',
    summary: 'セブン-イレブン商品券',
    yuutai_yield: 0.8,
    dividend_yield: 2.0,
    min_investment: 220000,
    risk_score: 40,
    risk_icon: '🟡',
    timing_signal: 'watch',
    timing_label: '様子見',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">株主優待チェッカー</h1>
            <p className="text-xs text-gray-400">好きなお店・サービスから銘柄を探す</p>
          </div>
          <Link
            href="/watchlist"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            ⭐ ウォッチリスト
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* カテゴリグリッド */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">カテゴリから探す</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs text-gray-600 leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 銘柄一覧 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">注目銘柄</h2>
            <span className="text-xs text-gray-400">※ 現在モックデータ表示中</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MOCK_STOCKS.map(stock => (
              <StockCard key={stock.code} stock={stock} />
            ))}
          </div>
        </section>
      </main>

      {/* フッター（デプロイ日時表示） */}
      <footer className="mt-12 border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <p>株主優待チェッカー</p>
        <p className="mt-1">更新日時: {DEPLOY_DATE}</p>
      </footer>
    </div>
  )
}
