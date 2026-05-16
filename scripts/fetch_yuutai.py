import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import os
from datetime import date
from supabase import create_client

# termの値はフォームのラジオボタンのvalue（日本語）をそのまま使う
MONTH_PARAMS = {
    '1月20日': '1月20',  '1月末': '1月末',
    '2月15日': '2月15',  '2月20日': '2月20',  '2月末': '2月末',
    '3月15日': '3月15',  '3月20日': '3月20',  '3月末': '3月末',
    '4月末': '4月末',
    '5月15日': '5月15',  '5月20日': '5月20',  '5月末': '5月末',
    '6月20日': '6月20',  '6月末': '6月末',
    '7月20日': '7月20',  '7月末': '7月末',
    '8月20日': '8月20',  '8月末': '8月末',
    '9月20日': '9月20',  '9月末': '9月末',
    '10月20日': '10月20', '10月末': '10月末',
    '11月15日': '11月15', '11月20日': '11月20', '11月末': '11月末',
    '12月20日': '12月20', '12月末': '12月末',
    'その他': 'その他',
}

def fetch_yuutai_page(term_param):
    url = 'https://96ut.com/yuutai/list.php'
    params = {
        'term': term_param,
        'days': '0',
        'kabucom': 'on',
        'matsui': 'on',
        'rakuten': 'on',
        'sbi': 'on',
        'nikko': 'on',
        'gmo': 'on',
        'order': 'needamount',
        'gdate': date.today().isoformat(),
        'key_y': 'y',  # 「優待リスト出力」ボタンのvalue
    }
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    response = requests.get(url, params=params, headers=headers)
    response.encoding = 'utf-8'
    return response.text

def parse_yuutai_table(html, kakutei_month_label):
    # 列構造（11列）:
    # [0]code [1]market [2]credit [3]name[content] [4]price [5]unit
    # [6]volume [7]貸株残 [8]min_investment [9]max_gyakuhibu [10]yuutai_yield
    soup = BeautifulSoup(html, 'html.parser')
    records = []

    for table in soup.find_all('table'):
        for row in table.find_all('tr'):
            cols = row.find_all('td')

            # 11列ある行のみ対象（データ行）
            if len(cols) != 11:
                continue

            code_text = cols[0].get_text(strip=True)
            if not re.match(r'^\d{3,4}[A-Z]?$', code_text):
                continue

            name_raw = cols[3].get_text(strip=True)
            content_match = re.search(r'\[(.+?)\]', name_raw)
            name = re.sub(r'\[.+?\]', '', name_raw).strip()
            content = content_match.group(1) if content_match else ''

            def safe_get(idx):
                try:
                    return cols[idx].get_text(strip=True).replace(',', '')
                except Exception:
                    return ''

            records.append({
                'code':           code_text,
                'market':         safe_get(1),
                'name':           name,
                'summary':        content,
                'current_price':  safe_get(4),
                'unit':           safe_get(5),
                'min_investment': safe_get(8),
                'max_gyakuhibu':  safe_get(9),
                'yuutai_yield':   safe_get(10),
                'kakutei_month':  kakutei_month_label,
                'category':       '',
                'yuutai_value':   '',
            })

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

        print(f"取得中：{label}...")
        html = fetch_yuutai_page(param)
        records = parse_yuutai_table(html, label)
        all_records.extend(records)
        print(f"  -> {len(records)}件取得")
        time.sleep(1)

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
        'category':       r['category'] or None,
        'min_investment': int(r['min_investment']) if r['min_investment'] else None,
        'stock_price':    int(r['current_price']) if r['current_price'] else None,
    } for r in records]

    supabase.table('stocks').upsert(stocks_records, on_conflict='code').execute()

    yuutai_records = [{
        'code':          r['code'],
        'summary':       r['summary'],
        'kakutei_month': r['kakutei_month'],
        'yuutai_yield':  float(r['yuutai_yield']) if r['yuutai_yield'] and r['yuutai_yield'] != '---' else None,
        'yuutai_value':  int(r['yuutai_value']) if r['yuutai_value'] else None,
    } for r in records]

    supabase.table('yuutai').upsert(yuutai_records, on_conflict='code').execute()

    print(f"Supabaseアップロード完了：{len(records)}件")

if __name__ == '__main__':
    records = get_all_yuutai()  # 全権利月を取得
    df = save_csv(records, 'yuutai_data.csv')
    if not df.empty:
        upload_to_supabase(df)
