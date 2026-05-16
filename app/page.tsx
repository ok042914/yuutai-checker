export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import CategoryBrowser from '@/components/CategoryBrowser'
import { StockCardData } from '@/components/StockCard'
import { calcTimingSignal } from '@/lib/riskScore'

const DEPLOY_DATE = '2026-05-17 01:12 JST'

async function fetchStocks(): Promise<StockCardData[]> {
  try {
    const supabase = createServerClient()

    const { data: stocks, error } = await supabase
      .from('stocks')
      .select(`
        code, name, category, stock_price, min_investment,
        yuutai ( summary, kakutei_month, kakutei_date, kenri_date, yuutai_yield ),
        financials ( dividend_yield ),
        risk_scores ( risk_score )
      `)
      .order('code')
      .limit(2000)

    if (error || !stocks) {
      console.error('Supabase fetch error:', error)
      return []
    }
    console.log('取得件数:', stocks.length)
    console.log('カテゴリサンプル:', stocks.slice(0, 3).map((s: any) => ({ code: s.code, category: s.category })))

    return stocks.map((s: any) => {
      const yuutai = Array.isArray(s.yuutai) ? s.yuutai[0] : s.yuutai
      const financial = Array.isArray(s.financials) ? s.financials[0] : s.financials
      const riskRow = Array.isArray(s.risk_scores) ? s.risk_scores[0] : s.risk_scores

      const riskScore: number | null = riskRow?.risk_score ?? null
      const riskIcon = riskScore === null ? '⚪' : riskScore <= 30 ? '🟢' : riskScore <= 60 ? '🟡' : '🔴'

      const kakuteiDate = yuutai?.kakutei_date ? new Date(yuutai.kakutei_date) : null
      const kenriDate = yuutai?.kenri_date ? new Date(yuutai.kenri_date) : null
      const timing = calcTimingSignal(kenriDate, kakuteiDate)

      return {
        code: s.code,
        name: s.name,
        category: s.category ?? null,
        kakutei_month: yuutai?.kakutei_month ?? null,
        summary: yuutai?.summary ?? '',
        yuutai_yield: yuutai?.yuutai_yield ?? null,
        dividend_yield: financial?.dividend_yield ?? null,
        min_investment: s.min_investment ?? null,
        risk_score: riskScore,
        risk_icon: riskIcon,
        timing_signal: timing.signal,
        timing_label: timing.label,
      } satisfies StockCardData
    })
  } catch {
    return []
  }
}

export default async function HomePage() {
  const stocks = await fetchStocks()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">株主優待チェッカー</h1>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{DEPLOY_DATE}</span>
            </div>
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
        <CategoryBrowser stocks={stocks} />
      </main>

      <footer className="mt-12 border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <p>株主優待チェッカー</p>
        <p className="mt-1">更新日時: {DEPLOY_DATE}</p>
      </footer>
    </div>
  )
}
