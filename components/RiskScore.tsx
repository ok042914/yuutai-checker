'use client'

interface ScoreBreakdown {
  consecutive_loss: number
  equity_ratio_decline: number
  negative_operating_cf: number
  high_yuutai_cost: number
  yuutai_deterioration: number
}

interface RiskScoreProps {
  score: number
  breakdown?: ScoreBreakdown | null
}

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  consecutive_loss: '2期以上連続減益',
  equity_ratio_decline: '自己資本比率の低下トレンド',
  negative_operating_cf: '営業CFがマイナス',
  high_yuutai_cost: '優待コスト/純利益が10%超',
  yuutai_deterioration: '直近の優待改悪履歴あり',
}

const BREAKDOWN_MAX: Record<keyof ScoreBreakdown, number> = {
  consecutive_loss: 30,
  equity_ratio_decline: 20,
  negative_operating_cf: 15,
  high_yuutai_cost: 20,
  yuutai_deterioration: 15,
}

function getRiskConfig(score: number) {
  if (score <= 30) {
    return { icon: '🟢', label: '低リスク', color: 'text-green-600', bgColor: 'bg-green-50', barColor: 'bg-green-400' }
  }
  if (score <= 60) {
    return { icon: '🟡', label: '要注意', color: 'text-yellow-600', bgColor: 'bg-yellow-50', barColor: 'bg-yellow-400' }
  }
  return { icon: '🔴', label: '高リスク', color: 'text-red-600', bgColor: 'bg-red-50', barColor: 'bg-red-500' }
}

export default function RiskScore({ score, breakdown }: RiskScoreProps) {
  const config = getRiskConfig(score)

  return (
    <div className={`rounded-lg p-4 ${config.bgColor} border border-opacity-20`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{config.icon}</div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">廃止リスクスコア</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${config.color}`}>{score}</span>
            <span className="text-gray-400 text-sm">/ 100</span>
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
        </div>
      </div>

      {/* スコアバー */}
      <div className="mb-4">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 低リスク</span>
          <span>30</span>
          <span>60</span>
          <span>高リスク 100</span>
        </div>
      </div>

      {/* 内訳 */}
      {breakdown && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 mb-2">スコア内訳</p>
          {(Object.keys(breakdown) as Array<keyof ScoreBreakdown>).map(key => {
            const value = breakdown[key]
            const maxValue = BREAKDOWN_MAX[key]
            const isRisk = value > 0
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 text-base">{isRisk ? '⚠️' : '✅'}</span>
                <span className={`flex-1 ${isRisk ? 'text-gray-700' : 'text-gray-400'}`}>
                  {BREAKDOWN_LABELS[key]}
                </span>
                <span className={`font-semibold shrink-0 ${isRisk ? config.color : 'text-gray-300'}`}>
                  +{value}/{maxValue}点
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">※ あくまで参考指標です</p>
    </div>
  )
}
