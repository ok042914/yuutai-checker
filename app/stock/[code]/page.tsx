export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import StockDetailClient from './StockDetailClient'

interface PageProps {
  params: { code: string }
}

export default async function StockDetailPage({ params }: PageProps) {
  const { code } = params
  const supabase = createServerClient()

  const { data: stock, error: stockError } = await supabase
    .from('stocks')
    .select('code, name, market, category, stock_price, min_investment')
    .eq('code', code)
    .maybeSingle()
  if (stockError) throw new Error('銘柄情報を取得できませんでした')
  if (!stock) notFound()

  const [yuutaiResult, financialResult, riskResult, historyResult] = await Promise.all([
    supabase.from('yuutai')
      .select('summary, detail, kakutei_month, kakutei_date, kenri_date, yuutai_value, yuutai_yield')
      .eq('code', code).order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from('financials').select('year, dividend_yield, updated_at')
      .eq('code', code).order('year', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false }).limit(3),
    supabase.from('risk_scores').select('risk_score, score_breakdown, calculated_at')
      .eq('code', code).order('calculated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from('price_history')
      .select('kakutei_date, drop_rate, recovery_1w, recovery_1m, recovery_3m, recovery_days')
      .eq('code', code).order('kakutei_date', { ascending: false, nullsFirst: false }).limit(5),
  ])
  if ([yuutaiResult, financialResult, riskResult, historyResult].some(result => result.error)) {
    throw new Error('銘柄の関連データを取得できませんでした')
  }

  return (
    <StockDetailClient
      key={stock.code}
      stock={stock}
      yuutai={yuutaiResult.data ?? null}
      financials={financialResult.data ?? []}
      risk={riskResult.data ?? null}
      priceHistory={historyResult.data ?? []}
    />
  )
}
