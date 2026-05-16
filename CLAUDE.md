# CLAUDE.md - 株主優待チェッカー

## 基本方針
- 確認なしで自律的に実装を進める
- ファイルの作成・編集・削除は自律的に実行する
- 判断が必要な場合はREADME.mdの要件定義書に従う
- エラーは自分で修正して続行する
- 完了時は実装内容のサマリーのみ報告する

## 技術スタック
- Next.js 14（App Router）
- TypeScript
- Tailwind CSS
- Supabase（@supabase/supabase-js）
- Vercel（ホスティング・cron jobs）
- Python 3.x（データ取得スクリプト）

## ディレクトリ構成
```
yuutai-checker/
├── app/
│   ├── page.tsx                          カテゴリブラウズ（トップ）
│   ├── stock/[code]/page.tsx             銘柄詳細チェック
│   ├── watchlist/page.tsx                ウォッチリスト
│   └── api/
│       ├── jquants/route.ts              J-Quants API接続
│       └── cron/
│           └── update-stocks/route.ts
├── components/
│   ├── StockCard.tsx
│   ├── RiskScore.tsx
│   ├── RecoveryPattern.tsx
│   ├── TimingBadge.tsx
│   └── WatchlistButton.tsx
├── lib/
│   ├── supabase.ts
│   ├── jquants.ts
│   └── riskScore.ts
└── scripts/
    ├── fetch_yuutai.py
    └── requirements.txt
```

## コーディング規約
- コンポーネントはTypeScript + 関数コンポーネント
- ファイル名はケバブケース（stock-card.tsx）
- APIルートはapp/api/配下に置く
- Supabaseクライアントはlib/supabase.tsから呼ぶ
- J-Quants APIはlib/jquants.tsから呼ぶ
- 環境変数は必ずprocess.env経由で読む
- サーバーコンポーネントとクライアントコンポーネントを適切に分ける
- エラーハンドリングは必ず実装する
- console.logはデバッグ用途のみ・本番では削除

## 環境変数
```
JQUANTS_API_KEY        J-Quants V2 APIキー
SUPABASE_URL           SupabaseプロジェクトURL
SUPABASE_ANON_KEY      Supabase公開キー（クライアント用）
SUPABASE_SERVICE_KEY   Supabaseサービスキー（サーバーのみ）
CRON_SECRET            cron認証用文字列
```

## Supabaseテーブル
```
stocks          銘柄基本情報（code: primary key）
yuutai          優待情報（code: foreign key）
financials      財務情報（code: foreign key）
risk_scores     廃止リスクスコア（code: foreign key）
price_history   権利落ち後値動き（code: foreign key）
watchlist       ウォッチリスト
```

## リスクスコア算出ロジック
```
2期以上連続減益           +30点
自己資本比率の低下トレンド  +20点
営業CFがマイナス           +15点
優待コスト/純利益が10%超   +20点
直近の優待改悪履歴あり     +15点

合計 0〜30点  ：🟢 低リスク
合計 31〜60点 ：🟡 要注意
合計 61〜100点：🔴 高リスク
```

## 買いタイミング判定ロジック
```
🟢 権利落ち直後：権利落ち日から30日以内かつ回復パターン良好
🟡 閑散期：権利確定日まで90〜120日
🟠 直前割高：権利確定日まで30日以内
⚪ 様子見：上記以外
```

## やってはいけないこと
- .env.localをGitにコミットしない
- APIキーをコードに直接書かない
- SUPABASE_SERVICE_KEYをクライアントコンポーネントで使わない
- time.sleep()なしでスクレイピングしない（最低1秒）

## 自動的に判断してよいこと
- インポート文の整理・追加
- 型定義の追加・修正
- エラーハンドリングの実装方法
- Tailwindのクラス名の選択
- コンポーネントの分割
- ローディング状態の実装
- レスポンシブ対応
