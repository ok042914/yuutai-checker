export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import CategoryBrowser from '@/components/CategoryBrowser'
import { StockCardData } from '@/components/StockCard'
import { fetchAllPages, latestRow, latestFinancial, relationRows } from '@/lib/stock-data'
import { calcTimingSignal } from '@/lib/riskScore'

const DEPLOY_DATE = '2026-10-11 22:59 JST'

async function fetchStocks(): Promise<StockCardData[]> {
  const supabase = createServerClient()
  const stocks = await fetchAllPages(async (from, to) => {
    const { data, error } = await supabase
      .from('stocks')
      .select(`
        code, name, category, stock_price, min_investment,
        yuutai ( summary, kakutei_month, kakutei_date, kenri_date, yuutai_yield, updated_at ),
        financials ( dividend_yield, year, updated_at ),
        risk_scores ( risk_score, calculated_at )
      `)
      .order('code')
      .range(from, to)
    if (error || !data) {
      console.error('Stock list query failed', { code: error?.code ?? 'NO_DATA' })
      throw new Error('銘柄一覧を取得できませんでした')
    }
    return data
  })

  return stocks.map(s => {
    const yuutai = latestRow(s.yuutai, 'updated_at')
    const financial = latestFinancial(s.financials)
    const riskRow = latestRow(s.risk_scores, 'calculated_at')
    const riskScore = riskRow?.risk_score ?? null
    const timing = calcTimingSignal(
      yuutai?.kenri_date ? new Date(yuutai.kenri_date) : null,
      yuutai?.kakutei_date ? new Date(yuutai.kakutei_date) : null
    )
    return {
      code: s.code, name: s.name, category: s.category ?? null,
      kakutei_month: relationRows(s.yuutai).map(y => y.kakutei_month).filter(Boolean).join('、'),
      summary: yuutai?.summary ?? '',
      yuutai_yield: yuutai?.yuutai_yield ?? null,
      dividend_yield: financial?.dividend_yield ?? null,
      min_investment: s.min_investment ?? null,
      risk_score: riskScore,
      risk_icon: riskScore === null ? '⚪' : riskScore <= 30 ? '🟢' : riskScore <= 60 ? '🟡' : '🔴',
      timing_signal: timing.signal, timing_label: timing.label,
      financial_updated_at: financial?.updated_at ?? null,
    } satisfies StockCardData
  })
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
