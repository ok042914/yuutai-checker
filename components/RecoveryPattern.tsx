'use client'

interface PriceHistoryRow {
  kakutei_date: string | Date
  drop_rate: number | null
  recovery_1w: number | null
  recovery_1m: number | null
  recovery_3m: number | null
  recovery_days: number | null
}

interface RecoveryPatternProps {
  data: PriceHistoryRow[]
}

function formatRate(value: number | null): JSX.Element {
  if (value === null) return <span className="text-gray-300">-</span>
  const isPositive = value >= 0
  return (
    <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

function formatDropRate(value: number | null): JSX.Element {
  if (value === null) return <span className="text-gray-300">-</span>
  return (
    <span className="text-red-500 font-medium">
      {value.toFixed(2)}%
    </span>
  )
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}年`
}

function calcAvgRecoveryDays(data: PriceHistoryRow[]): string {
  const days = data.map(r => r.recovery_days).filter((v): v is number => v !== null)
  if (days.length === 0) return '-'
  const avg = days.reduce((s, v) => s + v, 0) / days.length
  return `${Math.round(avg)}日`
}

function calcAllRecovered(data: PriceHistoryRow[]): boolean {
  const relevant = data.filter(r => r.recovery_days !== null)
  return relevant.length > 0 && relevant.every(r => r.recovery_days !== null && r.recovery_days > 0)
}

export default function RecoveryPattern({ data }: RecoveryPatternProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        回復パターンデータなし
      </div>
    )
  }

  const avgDays = calcAvgRecoveryDays(data)
  const allRecovered = calcAllRecovered(data)

  return (
    <div>
      {/* サマリー */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">平均回復日数</p>
          <p className="font-semibold text-gray-800">{avgDays}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1 text-center">
          <p className="text-xs text-gray-400 mb-0.5">全年回復</p>
          <p className="font-semibold">
            {allRecovered ? <span className="text-green-600">✅ 全年回復</span> : <span className="text-orange-500">⚠️ 未回復あり</span>}
          </p>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="text-left py-2 px-3 font-medium border-b">年度</th>
              <th className="text-right py-2 px-3 font-medium border-b">落ち幅</th>
              <th className="text-right py-2 px-3 font-medium border-b">1週後</th>
              <th className="text-right py-2 px-3 font-medium border-b">1ヶ月後</th>
              <th className="text-right py-2 px-3 font-medium border-b">3ヶ月後</th>
              <th className="text-right py-2 px-3 font-medium border-b">回復日数</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-700">{formatDate(row.kakutei_date)}</td>
                <td className="py-2 px-3 text-right">{formatDropRate(row.drop_rate)}</td>
                <td className="py-2 px-3 text-right">{formatRate(row.recovery_1w)}</td>
                <td className="py-2 px-3 text-right">{formatRate(row.recovery_1m)}</td>
                <td className="py-2 px-3 text-right">{formatRate(row.recovery_3m)}</td>
                <td className="py-2 px-3 text-right text-gray-600">
                  {row.recovery_days !== null ? `${row.recovery_days}日` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
