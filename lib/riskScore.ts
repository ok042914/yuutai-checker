export interface FinancialData {
  net_profit: number | null
  equity_ratio: number | null
  operating_cf: number | null
  yuutai_cost_ratio: number | null
}

export interface ScoreBreakdown {
  consecutive_loss: number
  equity_ratio_decline: number
  negative_operating_cf: number
  high_yuutai_cost: number
  yuutai_deterioration: number
}

export interface RiskScoreResult {
  risk_score: number
  score_breakdown: ScoreBreakdown
  risk_level: 'low' | 'medium' | 'high'
  risk_label: string
  risk_icon: string
}

/**
 * 廃止リスクスコアを計算する（0〜100点、高いほどリスク大）
 * @param financials - 直近複数期分の財務データ（新しい順）
 * @param hasYuutaiDeterioration - 直近の優待改悪履歴があるか
 */
export function calcRiskScore(
  financials: FinancialData[],
  hasYuutaiDeterioration = false
): RiskScoreResult {
  const breakdown: ScoreBreakdown = {
    consecutive_loss: 0,
    equity_ratio_decline: 0,
    negative_operating_cf: 0,
    high_yuutai_cost: 0,
    yuutai_deterioration: 0,
  }

  // 2期以上連続減益 → +30点
  if (financials.length >= 2) {
    const profits = financials.map(f => f.net_profit).filter((v): v is number => v !== null)
    if (profits.length >= 2) {
      let consecutiveDecline = true
      for (let i = 0; i < profits.length - 1; i++) {
        if (profits[i] >= profits[i + 1]) {
          consecutiveDecline = false
          break
        }
      }
      if (consecutiveDecline && profits.length >= 2) {
        breakdown.consecutive_loss = 30
      }
    }
  }

  // 自己資本比率の低下トレンド → +20点
  if (financials.length >= 2) {
    const ratios = financials.map(f => f.equity_ratio).filter((v): v is number => v !== null)
    if (ratios.length >= 2) {
      let declining = true
      for (let i = 0; i < ratios.length - 1; i++) {
        if (ratios[i] >= ratios[i + 1]) {
          declining = false
          break
        }
      }
      if (declining) {
        breakdown.equity_ratio_decline = 20
      }
    }
  }

  // 営業CFがマイナス → +15点
  if (financials.length > 0) {
    const latestCF = financials[0].operating_cf
    if (latestCF !== null && latestCF < 0) {
      breakdown.negative_operating_cf = 15
    }
  }

  // 優待コスト/純利益が10%超 → +20点
  if (financials.length > 0) {
    const ratio = financials[0].yuutai_cost_ratio
    if (ratio !== null && ratio > 10) {
      breakdown.high_yuutai_cost = 20
    }
  }

  // 直近の優待改悪履歴あり → +15点
  if (hasYuutaiDeterioration) {
    breakdown.yuutai_deterioration = 15
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  const risk_score = Math.min(100, total)

  let risk_level: 'low' | 'medium' | 'high'
  let risk_label: string
  let risk_icon: string

  if (risk_score <= 30) {
    risk_level = 'low'
    risk_label = '低リスク'
    risk_icon = '🟢'
  } else if (risk_score <= 60) {
    risk_level = 'medium'
    risk_label = '要注意'
    risk_icon = '🟡'
  } else {
    risk_level = 'high'
    risk_label = '高リスク'
    risk_icon = '🔴'
  }

  return {
    risk_score,
    score_breakdown: breakdown,
    risk_level,
    risk_label,
    risk_icon,
  }
}

/**
 * 買いタイミングを判定する
 * @param kenriDate - 権利付最終日（権利確定前日）
 * @param kakuteiDate - 権利確定日
 * @param recoveryPatternGood - 回復パターンが良好か
 */
export function calcTimingSignal(
  kenriDate: Date | null,
  kakuteiDate: Date | null,
  recoveryPatternGood = false
): { signal: 'buy' | 'accumulate' | 'avoid' | 'watch'; label: string; icon: string; description: string } {
  const today = new Date()

  if (!kakuteiDate) {
    return {
      signal: 'watch',
      label: '様子見',
      icon: '⚪',
      description: '権利確定日情報なし',
    }
  }

  const daysToKakutei = Math.floor(
    (kakuteiDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  // 権利落ち直後（狙い目）: 権利落ち日から30日以内かつ回復パターンが良好
  if (daysToKakutei < -1 && daysToKakutei >= -30 && recoveryPatternGood) {
    return {
      signal: 'buy',
      label: '権利落ち直後（狙い目）',
      icon: '🟢',
      description: '権利落ち直後で、過去の回復パターンが良好です',
    }
  }

  // 閑散期（仕込み時）: 権利確定日まで90〜120日
  if (daysToKakutei >= 90 && daysToKakutei <= 120) {
    return {
      signal: 'accumulate',
      label: '閑散期（仕込み時）',
      icon: '🟡',
      description: '権利確定まで90〜120日。株価が落ち着いている時期です',
    }
  }

  // 権利確定直前（割高注意）: 権利確定日まで30日以内
  if (daysToKakutei >= 0 && daysToKakutei <= 30) {
    return {
      signal: 'avoid',
      label: '権利確定直前（割高注意）',
      icon: '🟠',
      description: '権利確定日が近く、株価が割高になりやすい時期です',
    }
  }

  return {
    signal: 'watch',
    label: '様子見',
    icon: '⚪',
    description: '現在は様子見の時期です',
  }
}
