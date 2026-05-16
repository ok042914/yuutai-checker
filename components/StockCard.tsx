import Link from 'next/link'
import TimingBadge from './TimingBadge'

export interface StockCardData {
  code: string
  name: string
  summary: string
  category?: string | null
  kakutei_month?: string | null
  yuutai_yield: number | null
  dividend_yield: number | null
  min_investment: number | null
  risk_score: number | null
  risk_icon: string
  timing_signal: 'buy' | 'accumulate' | 'avoid' | 'watch'
  timing_label: string
}

interface StockCardProps {
  stock: StockCardData
}

function getRiskIcon(score: number | null): string {
  if (score === null) return '⚪'
  if (score <= 30) return '🟢'
  if (score <= 60) return '🟡'
  return '🔴'
}

function formatYield(yuutai: number | null, dividend: number | null): string {
  const total = (yuutai ?? 0) + (dividend ?? 0)
  if (total === 0) return '-'
  return `${total.toFixed(2)}%`
}

function formatMinInvestment(amount: number | null): string {
  if (!amount) return '-'
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}万円`
  }
  return `${amount.toLocaleString()}円`
}

export default function StockCard({ stock }: StockCardProps) {
  const combinedYield = formatYield(stock.yuutai_yield, stock.dividend_yield)
  const riskIcon = stock.risk_icon || getRiskIcon(stock.risk_score)

  return (
    <Link href={`/stock/${stock.code}`} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug break-words">{stock.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{stock.code}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-gray-500" title="廃止リスク">{riskIcon}</span>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{stock.summary || '優待情報なし'}</p>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <p className="text-gray-400">合算利回り</p>
            <p className="font-semibold text-blue-600 text-base">{combinedYield}</p>
          </div>
          <div>
            <p className="text-gray-400">最低投資額</p>
            <p className="font-medium text-gray-700">{formatMinInvestment(stock.min_investment)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <TimingBadge signal={stock.timing_signal} label={stock.timing_label} />
        </div>
      </div>
    </Link>
  )
}
