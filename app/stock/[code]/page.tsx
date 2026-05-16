'use client'

import { useState } from 'react'
import Link from 'next/link'
import RiskScore from '@/components/RiskScore'
import RecoveryPattern from '@/components/RecoveryPattern'
import TimingBadge from '@/components/TimingBadge'
import WatchlistButton from '@/components/WatchlistButton'

// デプロイ日時（更新確認用）
const DEPLOY_DATE = '2026-05-16 12:00'

// モックデータ（Supabase未接続時の表示用）
const MOCK_DATA = {
  stock: {
    code: '8267',
    name: 'イオン',
    market: 'プライム',
    category: '日常生活',
    stock_price: 2800,
    min_investment: 280000,
  },
  yuutai: {
    summary: 'オーナーズカード（3〜7%キャッシュバック）',
    detail: 'イオンオーナーズカードにより、イオン・マックスバリュ等での買い物金額に応じて3〜7%のキャッシュバックを受けられます。また、専門店でも5%割引が適用されます。',
    kakutei_month: '2月末',
    kakutei_date: new Date('2027-02-28'),
    kenri_date: new Date('2027-02-26'),
    yuutai_value: 8000,
    yuutai_yield: 2.86,
  },
  financials: [
    { year: 2024, operating_profit: 250000000000, net_profit: 80000000000, equity_ratio: 18.5, operating_cf: 320000000000, dividend_yield: 0.8, yuutai_cost_ratio: 8.5 },
    { year: 2023, operating_profit: 230000000000, net_profit: 72000000000, equity_ratio: 19.2, operating_cf: 290000000000, dividend_yield: 0.7, yuutai_cost_ratio: 7.8 },
    { year: 2022, operating_profit: 210000000000, net_profit: 65000000000, equity_ratio: 20.1, operating_cf: 270000000000, dividend_yield: 0.7, yuutai_cost_ratio: 7.2 },
  ],
  risk: {
    risk_score: 25,
    score_breakdown: {
      consecutive_loss: 0,
      equity_ratio_decline: 20,
      negative_operating_cf: 0,
      high_yuutai_cost: 0,
      yuutai_deterioration: 5,
    },
  },
  price_history: [
    { kakutei_date: '2024-02-29', drop_rate: -2.8, recovery_1w: 0.5, recovery_1m: 1.2, recovery_3m: 3.1, recovery_days: 18 },
    { kakutei_date: '2023-02-28', drop_rate: -3.2, recovery_1w: -0.3, recovery_1m: 2.1, recovery_3m: 4.5, recovery_days: 32 },
    { kakutei_date: '2022-02-28', drop_rate: -2.5, recovery_1w: 0.8, recovery_1m: 1.8, recovery_3m: 2.9, recovery_days: 14 },
    { kakutei_date: '2021-02-26', drop_rate: -1.9, recovery_1w: 1.2, recovery_1m: 2.5, recovery_3m: 5.2, recovery_days: 8 },
    { kakutei_date: '2020-02-28', drop_rate: -4.1, recovery_1w: -2.3, recovery_1m: -0.8, recovery_3m: 2.1, recovery_days: 45 },
  ],
}

// つなぎ売り計算
function calcTsunagiSell(
  minInvestment: number,
  lendingRate: number,
  days: number,
  yuutaiValue: number
) {
  const cost = Math.round(minInvestment * (lendingRate / 100) * (days / 365))
  const netProfit = yuutaiValue - cost
  const isEffective = netProfit > 0
  return { cost, netProfit, isEffective }
}

interface PageProps {
  params: { code: string }
}

export default function StockDetailPage({ params }: PageProps) {
  const { code } = params
  const data = MOCK_DATA // TODO: Supabase接続後に実データ取得

  const [lendingRate, setLendingRate] = useState(1.5)
  const [holdDays, setHoldDays] = useState(30)
  const [yuutaiValueInput, setYuutaiValueInput] = useState(data.yuutai.yuutai_value)

  const { cost, netProfit, isEffective } = calcTsunagiSell(
    data.stock.min_investment,
    lendingRate,
    holdDays,
    yuutaiValueInput
  )

  const combinedYield = (data.yuutai.yuutai_yield + (data.financials[0]?.dividend_yield ?? 0)).toFixed(2)

  const today = new Date()
  const kakuteiDate = data.yuutai.kakutei_date
  const daysToKakutei = Math.floor((kakuteiDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let timingSignal: 'buy' | 'accumulate' | 'avoid' | 'watch' = 'watch'
  let timingLabel = '様子見'
  let timingDescription = '現在は様子見の時期です'

  if (daysToKakutei < -1 && daysToKakutei >= -30) {
    timingSignal = 'buy'
    timingLabel = '権利落ち直後（狙い目）'
    timingDescription = '権利落ち直後で、過去の回復パターンが良好です'
  } else if (daysToKakutei >= 90 && daysToKakutei <= 120) {
    timingSignal = 'accumulate'
    timingLabel = '閑散期（仕込み時）'
    timingDescription = '権利確定まで90〜120日。株価が落ち着いている時期です'
  } else if (daysToKakutei >= 0 && daysToKakutei <= 30) {
    timingSignal = 'avoid'
    timingLabel = '権利確定直前（割高注意）'
    timingDescription = '権利確定日が近く、株価が割高になりやすい時期です'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-lg">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{data.stock.name}</h1>
            <p className="text-xs text-gray-400">{code} / {data.stock.market}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ※モックデータ警告 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          ※ 現在モックデータで表示しています。Supabase接続後に実データが表示されます。
        </div>

        {/* 買いタイミング */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">買いタイミング</h2>
          <TimingBadge signal={timingSignal} label={timingLabel} showDescription description={timingDescription} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <p className="text-gray-400">権利確定日</p>
              <p className="font-medium text-gray-700">{kakuteiDate.toLocaleDateString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-gray-400">権利付最終日</p>
              <p className="font-medium text-gray-700">{data.yuutai.kenri_date.toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </section>

        {/* 独自指標①：合算利回り */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">合算利回り</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">優待利回り</span>
              <span className="font-medium">{data.yuutai.yuutai_yield.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">配当利回り</span>
              <span className="font-medium">+ {data.financials[0]?.dividend_yield.toFixed(2)}%</span>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
              <span className="text-gray-700">合算利回り</span>
              <span className="text-blue-600 text-lg">{combinedYield}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            最低投資額 {data.stock.min_investment.toLocaleString()}円で
            年間 {Math.round(data.stock.min_investment * parseFloat(combinedYield) / 100).toLocaleString()}円相当
          </p>
        </section>

        {/* 独自指標②：廃止リスクスコア */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">廃止リスクスコア</h2>
          <RiskScore score={data.risk.risk_score} breakdown={data.risk.score_breakdown} />
        </section>

        {/* 独自指標③：権利落ち後の回復パターン */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">権利落ち後の回復パターン（過去5年）</h2>
          <RecoveryPattern data={data.price_history} />
        </section>

        {/* つなぎ売り損益計算 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">つなぎ売り損益計算</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">貸株料率（年率 %）</label>
              <input
                type="number"
                value={lendingRate}
                onChange={e => setLendingRate(parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">保有予定日数</label>
              <input
                type="number"
                value={holdDays}
                onChange={e => setHoldDays(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">優待価値（円換算）</label>
              <input
                type="number"
                value={yuutaiValueInput}
                onChange={e => setYuutaiValueInput(parseInt(e.target.value) || 0)}
                min="0"
                step="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
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
            </div>
          </div>
        </section>

        {/* 優待詳細 */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">優待内容</h2>
          <p className="text-sm font-medium text-gray-800 mb-2">{data.yuutai.summary}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{data.yuutai.detail}</p>
        </section>

        {/* ウォッチリスト */}
        <section>
          <WatchlistButton code={data.stock.code} name={data.stock.name} />
        </section>

        {/* 外部リンク */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">外部リンク</h2>
          <div className="flex gap-3">
            <a
              href={`https://site1.sbisec.co.jp/ETGate/?OutSide=on&Co_Code=${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 text-white text-sm rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              SBI証券で見る
            </a>
            <a
              href={`https://finance.yahoo.co.jp/quote/${code}.T`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-500 text-white text-sm rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Yahoo!ファイナンスで見る
            </a>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="mt-12 border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        <p>株主優待チェッカー</p>
        <p className="mt-1">更新日時: {DEPLOY_DATE}</p>
      </footer>
    </div>
  )
}
