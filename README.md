# 株主優待チェッカー 要件定義書 v3.1
Claude Code指示書

## 0. このドキュメントの使い方

このドキュメントをClaude Codeに渡して
「この要件定義書に従ってアプリを作って」
と指示するだけで開発を進められる形にしています。

**開発の進め方**
1. このドキュメントをGitHubリポジトリのREADME.mdとして保存する
2. Claude Codeに読み込ませて開発開始
3. フェーズ1から順番に実装する

---

## 1. プロジェクト概要

### アプリ名
株主優待チェッカー（Yuutai Checker）

### コンセプト
「好きなお店・使いたいサービスの株を、買っても大丈夫か確認するアプリ」

数字から探すのではなく、自分の生活圏・趣味・好みから銘柄を見つけて、その後に企業の健全性を確認する。

### ユーザーの行動フロー
```
① 生活カテゴリから優待を眺める
　↓
② 気になった銘柄を詳細チェック
　↓
③ ウォッチリストに追加
　↓
④ 買いタイミングを確認して購入判断
```

### 既存サービスとの役割分担

**既存サービスに任せること**
- SBI証券 → 基本的な優待検索・注文執行
- マネックス → 財務詳細分析
- 楽天証券 → 79項目スクリーニング

**自作アプリが担うこと**
- カテゴリ別の優待ブラウズ
- 4つの独自チェック指標
- ウォッチリスト管理
- 買いタイミング判定

---

## 2. 技術スタック

```yaml
フロントエンド:
  - Next.js 14（App Router）
  - Tailwind CSS
  - TypeScript

バックエンド:
  - Next.js API Routes
  - Python（データ取得スクリプト）

データベース:
  - Supabase（PostgreSQL）

ホスティング:
  - Vercel

データ取得:
  - J-Quants API V2（株価・財務データ）
  - Python スクレイピング（優待情報）

開発ツール:
  - Claude Code
  - GitHub
```

---

## 3. 環境変数

```bash
# .env.local に設定する
JQUANTS_API_KEY=       # J-Quants APIキー
SUPABASE_URL=          # SupabaseプロジェクトURL
SUPABASE_ANON_KEY=     # Supabase公開キー
SUPABASE_SERVICE_KEY=  # Supabaseサービスキー（サーバーのみ）
CRON_SECRET=           # Vercel cron jobs認証用ランダム文字列
```

**環境変数の取得先**

- `JQUANTS_API_KEY` → https://jpx-jquants.com → ダッシュボード → APIキーを発行
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` → Supabaseダッシュボード → Settings → API
- `CRON_SECRET` → 任意のランダム文字列を自分で設定（例：`openssl rand -base64 32` で生成）

---

## 4. データベース設計

### 4-1. stocksテーブル（銘柄基本情報）

```sql
create table stocks (
  code            varchar(10)   primary key,
  name            varchar(100)  not null,
  market          varchar(20),
  category        varchar(50),  -- 生活カテゴリ（手動設定）
  stock_price     integer,
  min_investment  integer,
  updated_at      timestamp     default now()
);
```

### 4-2. yuutaiテーブル（優待情報）

```sql
create table yuutai (
  id              uuid          primary key default gen_random_uuid(),
  code            varchar(10)   references stocks(code),
  summary         varchar(200), -- 優待内容一行サマリー
  detail          text,         -- 優待内容詳細
  kakutei_month   varchar(20),  -- 権利確定月（例：3end, 9end）
  kakutei_date    date,         -- 次回権利確定日
  kenri_date      date,         -- 権利付最終日
  yuutai_value    integer,      -- 優待価値（円換算・手動入力）
  yuutai_yield    decimal(5,2), -- 優待利回り
  updated_at      timestamp     default now()
);
```

### 4-3. financialsテーブル（財務情報）

```sql
create table financials (
  id                  uuid      primary key default gen_random_uuid(),
  code                varchar(10) references stocks(code),
  year                integer,
  operating_profit    bigint,
  net_profit          bigint,
  equity_ratio        decimal(5,2),
  operating_cf        bigint,
  dividend_yield      decimal(5,2),
  yuutai_cost_ratio   decimal(5,2), -- 優待コスト/純利益
  updated_at          timestamp default now()
);
```

### 4-4. risk_scoresテーブル（廃止リスク）

```sql
create table risk_scores (
  id              uuid      primary key default gen_random_uuid(),
  code            varchar(10) references stocks(code),
  risk_score      integer,  -- 0〜100（高いほどリスク大）
  score_breakdown jsonb,    -- 各項目の内訳
  calculated_at   timestamp default now()
);
```

### 4-5. price_historyテーブル（権利落ち後の値動き）

```sql
create table price_history (
  id              uuid      primary key default gen_random_uuid(),
  code            varchar(10) references stocks(code),
  kakutei_date    date,
  drop_rate       decimal(5,2), -- 権利落ち日の下落率
  recovery_1w     decimal(5,2), -- 1週間後の変化率
  recovery_1m     decimal(5,2), -- 1ヶ月後の変化率
  recovery_3m     decimal(5,2), -- 3ヶ月後の変化率
  recovery_days   integer       -- 元値回復までの日数
);
```

### 4-6. watchlistテーブル

```sql
create table watchlist (
  id        uuid      primary key default gen_random_uuid(),
  code      varchar(10) references stocks(code),
  added_at  timestamp default now(),
  memo      text
);
```

---

## 5. データ取得設計

### 5-1. 優待情報の取得（Pythonスクリプト）

**概要**
- 取得元：96ut.com（https://96ut.com/yuutai/list.php）
- 方式：URLパラメータで権利月を指定してGETリクエスト（チェックボックス操作・Selenium不要）
- 形式：HTMLテーブルをBeautifulSoupで解析
- 出力：CSV（yuutai_data.csv）

**権利月パラメータ一覧**

```python
MONTH_PARAMS = {
    '1月20日':  '1_20',
    '1月末':    '1end',
    '2月15日':  '2_15',
    '2月20日':  '2_20',
    '2月末':    '2end',
    '3月15日':  '3_15',
    '3月20日':  '3_20',
    '3月末':    '3end',  # 最多・重要
    '4月末':    '4end',
    '5月15日':  '5_15',
    '5月20日':  '5_20',
    '5月末':    '5end',
    '6月20日':  '6_20',
    '6月末':    '6end',
    '7月20日':  '7_20',
    '7月末':    '7end',
    '8月20日':  '8_20',
    '8月末':    '8end',
    '9月20日':  '9_20',
    '9月末':    '9end',  # 最多・重要
    '10月20日': '10_20',
    '10月末':   '10end',
    '11月15日': '11_15',
    '11月20日': '11_20',
    '11月末':   '11end',
    '12月20日': '12_20',
    '12月末':   '12end',
    'その他':   'other',
}
```

**スクリプト（scripts/fetch_yuutai.py）**

```python
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import os
from supabase import create_client

MONTH_PARAMS = {
    '1月20日': '1_20', '1月末': '1end',
    '2月15日': '2_15', '2月20日': '2_20', '2月末': '2end',
    '3月15日': '3_15', '3月20日': '3_20', '3月末': '3end',
    '4月末': '4end',
    '5月15日': '5_15', '5月20日': '5_20', '5月末': '5end',
    '6月20日': '6_20', '6月末': '6end',
    '7月20日': '7_20', '7月末': '7end',
    '8月20日': '8_20', '8月末': '8end',
    '9月20日': '9_20', '9月末': '9end',
    '10月20日': '10_20', '10月末': '10end',
    '11月15日': '11_15', '11月20日': '11_20', '11月末': '11end',
    '12月20日': '12_20', '12月末': '12end',
    'その他': 'other',
}

def fetch_yuutai_page(term_param):
    url = f"https://96ut.com/yuutai/list.php?term={term_param}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    response = requests.get(url, headers=headers)
    response.encoding = 'utf-8'
    return response.text

def parse_yuutai_table(html, kakutei_month_label):
    soup = BeautifulSoup(html, 'html.parser')
    records = []
    tables = soup.find_all('table')

    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if not cols:
                continue

            row_text = row.get_text()
            skip_keywords = [
                '一般信用売建', '信用規制', '松井規制',
                '逆日歩速報', '貸株注意',
            ]
            if any(kw in row_text for kw in skip_keywords):
                continue

            if len(cols) < 6:
                continue

            code_text = cols[0].get_text(strip=True)
            if not re.match(r'^\d{4}[A-Z]?$', code_text):
                continue

            name_cell = cols[2] if len(cols) > 2 else None
            name = ''
            content = ''

            if name_cell:
                text_lines = [
                    l for l in
                    name_cell.get_text(separator='\n', strip=True).split('\n')
                    if l
                ]
                name = text_lines[0] if text_lines else ''
                content_match = re.search(r'\[(.+?)\]', name_cell.get_text())
                content = content_match.group(1) if content_match else ''

            def safe_get(cols, idx):
                try:
                    return cols[idx].get_text(strip=True)
                except:
                    return ''

            record = {
                'code':           code_text,
                'market':         safe_get(cols, 1),
                'name':           name,
                'summary':        content,
                'current_price':  safe_get(cols, 3).replace(',', ''),
                'unit':           safe_get(cols, 4).replace(',', ''),
                'min_investment': safe_get(cols, 8).replace(',', ''),
                'max_gyakuhibu':  safe_get(cols, 9),
                'yuutai_yield':   safe_get(cols, 10),
                'kakutei_month':  kakutei_month_label,
                'category':       '',  # 手動入力
                'yuutai_value':   '',  # 手動入力
            }
            records.append(record)

    return records

def get_all_yuutai(target_months=None):
    if target_months is None:
        target_months = list(MONTH_PARAMS.keys())

    all_records = []

    for label in target_months:
        param = MONTH_PARAMS.get(label)
        if not param:
            print(f"不明な権利月：{label}")
            continue

        print(f"取得中：{label}（param={param}）...")
        html = fetch_yuutai_page(param)
        records = parse_yuutai_table(html, label)
        all_records.extend(records)
        print(f"  → {len(records)}件取得")
        time.sleep(1)  # サーバー負荷軽減

    return all_records

def save_csv(records, filename='yuutai_data.csv'):
    df = pd.DataFrame(records)
    if df.empty:
        print("データが取得できませんでした")
        return df

    df = df.drop_duplicates(subset=['code'], keep='first')

    for col in ['current_price', 'unit', 'min_investment']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df.to_csv(filename, index=False, encoding='utf-8-sig')
    print(f"保存完了：{filename}（{len(df)}銘柄）")
    return df

def upload_to_supabase(df):
    supabase = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_KEY']
    )
    records = df.fillna('').to_dict('records')

    stocks_records = [{
        'code':           r['code'],
        'name':           r['name'],
        'market':         r['market'],
        'category':       r['category'],
        'min_investment': r['min_investment'] or None,
        'stock_price':    r['current_price'] or None,
    } for r in records]

    supabase.table('stocks').upsert(
        stocks_records, on_conflict='code'
    ).execute()

    yuutai_records = [{
        'code':           r['code'],
        'summary':        r['summary'],
        'kakutei_month':  r['kakutei_month'],
        'yuutai_yield':   r['yuutai_yield'] or None,
        'yuutai_value':   r['yuutai_value'] or None,
    } for r in records]

    supabase.table('yuutai').upsert(
        yuutai_records, on_conflict='code'
    ).execute()

    print(f"Supabaseアップロード完了：{len(records)}件")

if __name__ == '__main__':
    # 主要4権利月を取得
    records = get_all_yuutai(['3月末', '6月末', '9月末', '12月末'])
    df = save_csv(records, 'yuutai_data.csv')
    # upload_to_supabase(df)  # Supabase接続確認後にコメントアウトを外す
```

### 5-2. 株価・財務データの取得（J-Quants API V2）

**認証方式**
- V2 APIはAPIキー認証を使用
- APIキーをHTTPヘッダーに設定するだけでOK
- トークン取得・リフレッシュ操作は不要

**Next.js API Route（app/api/jquants/route.ts）**

```typescript
const JQUANTS_BASE = 'https://api.jquants.com/v1'

async function jquantsFetch(endpoint: string) {
  const res = await fetch(`${JQUANTS_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.JQUANTS_API_KEY}`
    }
  })
  if (!res.ok) throw new Error(`J-Quants API error: ${res.status}`)
  return res.json()
}

// 使用例：株価取得
// const data = await jquantsFetch('/prices/daily_quotes?code=7203')

// 使用例：財務データ取得
// const data = await jquantsFetch('/fins/statements?code=7203')

// 使用例：配当情報取得
// const data = await jquantsFetch('/fins/dividend?code=7203')
```

**レートリミット対策**

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options)
    if (res.status === 429) {
      // 429: Too Many Requests → 待機してリトライ
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      continue
    }
    return res
  }
  throw new Error('Rate limit exceeded')
}
```

### 5-3. 自動更新（Vercel cron jobs）

**vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/update-stocks",
      "schedule": "0 1 * * 1-5"
    }
  ]
}
```

※月〜金の深夜1時に実行（土日は市場休場のためスキップ）

**app/api/cron/update-stocks/route.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {

  // セキュリティチェック
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // J-Quantsから株価データ取得
    const res = await fetch(
      'https://api.jquants.com/v1/prices/daily_quotes',
      {
        headers: {
          'Authorization': `Bearer ${process.env.JQUANTS_API_KEY}`
        }
      }
    )
    const data = await res.json()

    // Supabaseに保存
    const { error } = await supabase
      .from('stocks')
      .upsert(data.daily_quotes, { onConflict: 'code' })

    if (error) throw error

    return Response.json({
      success: true,
      updated: data.daily_quotes?.length
    })

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

### 5-4. 更新頻度まとめ

| データ種別 | 取得方法 | 更新頻度 |
|-----------|---------|---------|
| 株価 | J-Quants API | 毎営業日（cron） |
| 財務データ | J-Quants API | 四半期ごと（cron） |
| 配当情報 | J-Quants API | 四半期ごと（cron） |
| 優待情報 | Pythonスクリプト手動実行 | 変更時のみ（月1回程度） |
| 権利落ち後値動き | J-Quants API過去株価 | 過去分一括→月次追加 |
| リスクスコア | バッチ処理 | 週1回（cron） |

---

## 6. 機能要件

### 機能①：カテゴリブラウズ画面（/）

**カテゴリ一覧**
- 🍽️ 飲食・グルメ
- 🛒 日常生活（スーパー・ドラッグストア・100均）
- ✈️ 旅行・宿泊
- 🎬 エンタメ・レジャー
- 🏥 医療・健康
- 👗 ファッション・美容
- 🔧 ホームセンター・DIY
- 📚 書籍・文具・教育
- 🐾 ペット
- 🚗 車・移動
- 💻 IT・通信
- 🏦 金融・保険

**銘柄カード表示項目**
- 会社名・証券コード
- 優待内容（一行サマリー）
- 合算利回り（優待＋配当）
- 最低投資額
- 廃止リスク信号（🟢🟡🔴）
- 買いタイミング信号（🟢🟡🟠⚪）

### 機能②：銘柄詳細チェック画面（/stock/[code]）

**独自指標①：合算利回り**

```
優待利回り   ○.○%
配当利回り ＋ ○.○%
─────────────────
合算利回り   ○.○%
最低投資額○○円で年間○○円相当
```

**独自指標②：廃止リスクスコア**

スコア算出ロジック（0〜100点・高いほどリスク大）

| 条件 | 加算点 |
|-----|--------|
| 2期以上連続減益 | +30点 |
| 自己資本比率の低下トレンド | +20点 |
| 営業CFがマイナス | +15点 |
| 優待コスト/純利益が10%超 | +20点 |
| 直近の優待改悪履歴あり | +15点 |

表示
- 0〜30点：🟢 低リスク
- 31〜60点：🟡 要注意
- 61〜100点：🔴 高リスク

※あくまで参考指標です

**独自指標③：権利落ち後の回復パターン**

過去5年分を表示

| 年度 | 落ち幅 | 1週後 | 1ヶ月後 | 3ヶ月後 | 回復日数 |
|-----|--------|-------|--------|--------|---------|

平均回復日数・過去5年で全年回復したかを表示

**独自指標④：買いタイミング判定**

```
🟢 権利落ち直後（狙い目）
　条件：権利落ち日から30日以内
　　　　かつ過去の回復パターンが良好

🟡 閑散期（仕込み時）
　条件：権利確定日まで90〜120日

🟠 権利確定直前（割高注意）
　条件：権利確定日まで30日以内

⚪ 様子見
　条件：上記以外
```

**つなぎ売り損益計算**
- 入力：貸株料率・保有予定日数・優待価値
- 出力：コスト概算・差引損益・有効／非推奨の判定

**外部リンク**
- 「SBI証券で見る」ボタン
- 「Yahoo!ファイナンスで見る」ボタン

### 機能③：ウォッチリスト画面（/watchlist）

**登録銘柄一覧**
- 会社名・優待内容サマリー
- 合算利回り
- 廃止リスク信号
- 買いタイミング信号
- 次の権利確定日まで残り○日
- 個人メモ

---

## 7. 開発フェーズ

### フェーズ1：動くものを作る（目安2〜4週間）
- [ ] GitHubリポジトリ作成
- [ ] Next.js + Supabase + Tailwind CSS 初期設定
- [ ] Supabaseにテーブル作成（上記SQL実行）
- [ ] Pythonスクリプトで優待CSVを取得（まず3月末・9月末の主要銘柄30〜50件）
- [ ] CSVをSupabaseにインポート
- [ ] カテゴリブラウズ画面の実装
- [ ] 銘柄詳細画面（合算利回りのみ）の実装
- [ ] Vercelにデプロイ・動作確認

### フェーズ2：データ自動化（目安2〜4週間）
- [ ] J-Quants API接続実装
- [ ] 廃止リスクスコアの実装
- [ ] Vercel cron jobsで株価・財務データ自動更新
- [ ] リスクスコアの週次バッチ処理

### フェーズ3：分析機能追加（目安2〜4週間）
- [ ] 権利落ち後の回復パターン実装
- [ ] 過去株価データの一括取得・蓄積
- [ ] 買いタイミング判定の実装
- [ ] つなぎ売り損益計算の実装

### フェーズ4：利便性向上（目安2〜4週間）
- [ ] ウォッチリスト機能
- [ ] 個人メモ機能
- [ ] 買いタイミング通知（将来）
- [ ] UIの改善・レスポンシブ対応

---

## 8. ディレクトリ構成

```
yuutai-checker/
├── README.md                    ← このドキュメント
├── .env.local                   ← 環境変数（Git管理外）
├── .gitignore
├── vercel.json                  ← cron設定
├── package.json
│
├── app/                         ← Next.js App Router
│   ├── page.tsx                 ← カテゴリブラウズ（トップ）
│   ├── stock/
│   │   └── [code]/
│   │       └── page.tsx         ← 銘柄詳細チェック
│   ├── watchlist/
│   │   └── page.tsx             ← ウォッチリスト
│   └── api/
│       ├── jquants/
│       │   └── route.ts         ← J-Quants API接続
│       └── cron/
│           └── update-stocks/
│               └── route.ts     ← 自動更新cron
│
├── components/                  ← UIコンポーネント
│   ├── StockCard.tsx            ← 銘柄カード
│   ├── RiskScore.tsx            ← リスクスコア表示
│   ├── RecoveryPattern.tsx      ← 回復パターングラフ
│   ├── TimingBadge.tsx          ← 買いタイミング信号
│   └── WatchlistButton.tsx      ← ウォッチリスト追加ボタン
│
├── lib/
│   ├── supabase.ts              ← Supabaseクライアント
│   ├── jquants.ts               ← J-Quants APIクライアント
│   └── riskScore.ts             ← リスクスコア計算ロジック
│
└── scripts/                     ← Pythonスクリプト
    ├── fetch_yuutai.py          ← 優待データ取得
    ├── requirements.txt         ← Python依存パッケージ
    └── README.md                ← スクリプトの使い方
```

---

## 9. コスト

| サービス | 月額 |
|---------|------|
| J-Quants（無料プラン） | 無料 |
| Vercel（Hobby） | 無料 |
| Supabase（無料枠） | 無料 |
| **合計** | **0円** |

---

## 10. 未決定事項

**① 優待価値の円換算基準**
- 食事券：額面通り
- 自社製品：定価の70%
- カタログギフト：掲載金額通り
- 割引券：年間想定利用額で計算
- （初回データ投入時に個別判断）

**② 初回データの対象銘柄**
- 自分の生活圏・趣味から30〜50銘柄に絞って開始
- 全銘柄取り込みは後回し

**③ カテゴリの複数所属の扱い**
- 例：イオンは🛒日常生活と🍽️飲食にまたがる
- メインカテゴリ1つに絞るか複数許容するか

---

## 11. Claude Codeへの最初の指示文

このドキュメントを読み込ませた後、以下をそのまま渡してください。

```
この要件定義書に従って株主優待チェッカーアプリを作ります。

まずフェーズ1から始めてください。

① GitHubリポジトリの初期設定
　・Next.js 14（App Router）+ TypeScript + Tailwind CSSで
　　プロジェクトを作成
　・.gitignoreに.env.localを含める
　・vercel.jsonを作成

② Supabaseのテーブル作成
　・要件定義書のSQLをそのまま実行できる
　　マイグレーションファイルを作成

③ Pythonスクリプトの配置
　・scripts/fetch_yuutai.pyを作成
　・scripts/requirements.txtを作成

④ 環境変数の設定ガイド
　・.env.localのテンプレートを作成

順番に進めてください。
```
