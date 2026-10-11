'use client'

import { useState } from 'react'
import Link from 'next/link'
import RiskScore from '@/components/RiskScore'
import RecoveryPattern from '@/components/RecoveryPattern'
import TimingBadge from '@/components/TimingBadge'
import WatchlistButton from '@/components/WatchlistButton'
import { combinedYield as sumYield } from '@/lib/stock-data'
import { calcTimingSignal } from '@/lib/riskScore'

const DEPLOY_DATE = '2026-10-11 22:46 JST'

type StockData = {
  code: string
  name: string
  market: string | null
  category: string | null
  stock_price: number | null
  min_investment: number | null
}

type YuutaiData = {
  summary: string | null
  detail: string | null
  kakutei_month: string | null
  kakutei_date: string | null
  kenri_date: string | null
  yuutai_value: number | null
  yuutai_yield: number | null
} | null

type FinancialRow = {
  year: number | null
  dividend_yield: number | null
}

type RiskData = {
  risk_score: number | null
  score_breakdown: {
    consecutive_loss: number
    equity_ratio_decline: number
    negative_operating_cf: number
    high_yuutai_cost: number
    yuutai_deterioration: number
  } | null
  calculated_at?: string | null
} | null

type PriceHistoryRow = {
  kakutei_date: string
  drop_rate: number | null
  recovery_1w: number | null
  recovery_1m: number | null
  recovery_3m: number | null
  recovery_days: number | null
}

interface Props {
  stock: StockData
  yuutai: YuutaiData
  financials: FinancialRow[]
  risk: RiskData
  priceHistory: PriceHistoryRow[]
}

function calcTsunagiSell(minInvestment: number, lendingRate: number, days: number, yuutaiValue: number) {
  const cost = Math.round(minInvestment * (lendingRate / 100) * (days / 365))
  const netProfit = yuutaiValue - cost
  return { cost, netProfit, isEffective: netProfit > 0 }
}

export default function StockDetailClient({ stock, yuutai, financials, risk, priceHistory }: Props) {
  const defaultYuutaiValue = yuutai?.yuutai_value ?? ''
  const [lendingRate, setLendingRate] = useState(1.5)
  const [holdDays, setHoldDays] = useState(30)
  const [yuutaiValueInput, setYuutaiValueInput] = useState<number | string>(defaultYuutaiValue)

  const minInvestment = stock.min_investment ?? 0
  const { cost, netProfit, isEffective } = calcTsunagiSell(minInvestment, lendingRate, holdDays, Number(yuutaiValueInput))

  const dividendYield = financials[0]?.dividend_yield ?? null
  const yuutaiYield = yuutai?.yuutai_yield ?? null
  const combinedYield = sumYield(yuutaiYield, dividendYield)?.toFixed(2) ?? null
  const canCalculate = stock.min_investment !== null && stock.min_investment > 0
    && Number.isFinite(lendingRate) && lendingRate >= 0
    && Number.isInteger(holdDays) && holdDays >= 1
    && yuutaiValueInput !== '' && Number.isFinite(Number(yuutaiValueInput)) && Number(yuutaiValueInput) >= 0

  const kakuteiDate = yuutai?.kakutei_date ? new Date(yuutai.kakutei_date) : null
  const kenriDate = yuutai?.kenri_date ? new Date(yuutai.kenri_date) : null
  const timing = calcTimingSignal(kenriDate, kakuteiDate)


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" aria-label="銘柄一覧へ戻る" className="text-gray-400 hover:text-gray-700 text-lg">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{stock.name}</h1>
            <p className="text-xs text-gray-400">{stock.code} / {stock.market ?? ''}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 買いタイミング */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">買いタイミング</h2>
          <TimingBadge signal={timing.signal} label={timing.label} showDescription description={timing.description} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <p className="text-gray-400">権利確定日</p>
              <p className="font-medium text-gray-700">
                {kakuteiDate ? kakuteiDate.toLocaleDateString('ja-JP') : 'データなし'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">権利付最終日</p>
              <p className="font-medium text-gray-700">
                {kenriDate ? kenriDate.toLocaleDateString('ja-JP') : 'データなし'}
              </p>
            </div>
          </div>
        </section>

        {/* 合算利回り */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">合算利回り</h2>
          <div className="text-sm space-y-1 mb-3">
            <p>優待利回り: {yuutaiYield === null ? 'データなし' : `${yuutaiYield.toFixed(2)}%`}</p>
            <p>配当利回り: {dividendYield === null ? 'データなし' : `${dividendYield.toFixed(2)}%`}</p>
          </div>
          {combinedYield !== null ? (
            <div className="space-y-1 text-sm">
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">合算利回り</span>
                <span className="text-blue-600 text-lg">{combinedYield}%</span>
              </div>
              {minInvestment > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  最低投資額 {minInvestment.toLocaleString()}円で
                  年間 {Math.round(minInvestment * parseFloat(combinedYield) / 100).toLocaleString()}円相当
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">利回りデータなし</p>
          )}
        </section>

        {/* 廃止リスクスコア */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">廃止リスクスコア</h2>
            {risk?.calculated_at && (
              <span className="text-xs text-gray-400">
                財務取得: {risk.calculated_at.slice(0, 10)}
              </span>
            )}
          </div>
          {risk?.risk_score != null ? (
            <RiskScore score={risk.risk_score} breakdown={risk.score_breakdown} />
          ) : (
            <p className="text-sm text-gray-400">データなし（リスクを算出できません）</p>
          )}
        </section>

        {/* 権利落ち後の回復パターン */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">権利落ち後の回復パターン（直近5件）</h2>
          {priceHistory.length > 0 ? (
            <RecoveryPattern data={priceHistory} />
          ) : (
            <p className="text-sm text-gray-400">データなし（株価履歴が未登録です）</p>
          )}
        </section>

        {/* つなぎ売り損益計算 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">つなぎ売り損益計算</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="lending-rate" className="text-xs text-gray-500 block mb-1">貸株料率（年率 %）</label>
              <input
                id="lending-rate"
                type="number"
                value={lendingRate}
                onChange={e => setLendingRate(parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label htmlFor="hold-days" className="text-xs text-gray-500 block mb-1">保有予定日数</label>
              <input
                id="hold-days"
                type="number"
                value={holdDays}
                onChange={e => setHoldDays(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label htmlFor="yuutai-value" className="text-xs text-gray-500 block mb-1">優待価値（円換算）</label>
              <input
                id="yuutai-value"
                type="number"
                value={yuutaiValueInput}
                onChange={e => setYuutaiValueInput(e.target.value)}
                min="0"
                step="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {canCalculate ? <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">コスト概算（貸株料）</span>
                <span className="text-red-500">-{cost.toLocaleString()}円</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                <span>差引損益</span>
                <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}円
                </span>
              </div>
              <div className="mt-1">
                {isEffective ? (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1">
                    ✅ つなぎ売り有効
                  </span>
                ) : (
                  <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-2 py-1">
                    ⚠️ 非推奨（コスト超過）
                  </span>
                )}
              </div>
            </div> : <p className="text-sm text-gray-500">{stock.min_investment === null || stock.min_investment <= 0 ? '最低投資額のデータなし（計算不可）' : '優待価値を入力し、貸株料率・優待価値は0以上、保有予定日数は1以上の整数で入力してください'}</p>}
          </div>
        </section>

        {/* 優待詳細 */}
        {yuutai && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">優待内容</h2>
            {yuutai.summary && <p className="text-sm font-medium text-gray-800 mb-2">{yuutai.summary}</p>}
            {yuutai.detail && <p className="text-xs text-gray-500 leading-relaxed">{yuutai.detail}</p>}
          </section>
        )}

        {/* ウォッチリスト */}
        <section>
          <WatchlistButton code={stock.code} name={stock.name} />
        </section>

        {/* 外部リンク */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">外部リンク</h2>
          <div className="flex gap-3">
            <a
              href={`https://site1.sbisec.co.jp/ETGate/?OutSide=on&Co_Code=${stock.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              SBI証券で見る
            </a>
            <a
              href={`https://finance.yahoo.co.jp/quote/${stock.code}.T`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-500 text-white text-sm rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Yahoo!ファイナンスで見る
            </a>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <p>株主優待チェッカー</p>
        <p className="mt-1">更新日時: {DEPLOY_DATE}</p>
      </footer>
    </div>
  )
}
