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
        print(f"  -> {len(records)}件取得")
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
