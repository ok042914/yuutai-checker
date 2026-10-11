require('./stock-data.test.cjs')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const HomePage = require('../app/page.tsx').default
const StockDetailPage = require('../app/stock/[code]/page.tsx').default
const ErrorPage = require('../app/error.tsx').default
process.env.SUPABASE_URL = 'http://local-test.invalid'
process.env.SUPABASE_SERVICE_KEY = 'local-test-key'
const assert = require('node:assert/strict')
let mode = 'ok'
const requests=[]
const stock = {code:'1000',name:'検証銘柄',category:null,market:'東証',stock_price:1000,min_investment:100000}
const yuutai = {summary:'テスト優待',detail:null,kakutei_month:'3月末',kakutei_date:null,kenri_date:null,yuutai_yield:3,yuutai_value:null,updated_at:'2026-01-01'}
const financials=[{year:2024,dividend_yield:9,updated_at:'2026-01-01'},{year:2025,dividend_yield:2,updated_at:'2026-02-01'}]
const risks=[{risk_score:90,calculated_at:'2025-01-01',score_breakdown:null},{risk_score:10,calculated_at:'2026-01-01',score_breakdown:null}]
global.fetch = async (input, init) => {
  const req = {method: init?.method ?? 'GET',url:String(input),headers:Object.fromEntries(new Headers(init?.headers))}
  let status=200
  const res={setHeader(){},set statusCode(value){status=value},end(body){return new Response(body,{status,headers:{'Content-Type':'application/json'}})}}
  assert.equal(req.method,'GET','Test must never write data')
  const url=new URL(req.url,'http://localhost'), table=url.pathname.split('/').pop()
  requests.push({table,offset:url.searchParams.get('offset')||'0'})
  res.setHeader('Content-Type','application/json')
  if(mode==='failed' || (mode==='pageFailed' && url.searchParams.get('offset')==='500') || (mode==='relatedFailed' && table==='financials')) {res.statusCode=400;return res.end(JSON.stringify({code:'TEST',message:'simulated failure'}))}
  let rows=[]
  if(table==='stocks') {
    if(url.searchParams.has('code')) rows=url.searchParams.get('code')==='eq.1000'?[stock]:[]
    else {
      const offset=Number(url.searchParams.get('offset')||0), limit=Number(url.searchParams.get('limit')||1000)
      rows=Array.from({length:1005},(_,i)=>({...stock,code:String(1000+i),name:`検証銘柄${i}`,yuutai:mode==='singleRelation'?yuutai:mode==='nullRelation'?null:[yuutai],financials:mode==='singleRelation'?financials[1]:mode==='nullRelation'?null:financials,risk_scores:mode==='singleRelation'?risks[1]:mode==='nullRelation'?null:risks})).slice(offset,offset+limit)
    }
  } else if(table==='yuutai') rows=mode==='missing'?[]:[yuutai]
  else if(table==='financials') rows=mode==='missing'?[]:[financials[1],financials[0]]
  else if(table==='risk_scores') rows=mode==='missing'?[]:[risks[1]]
  else if(table==='price_history') rows=[]
  const isObject=(req.headers.accept||'').includes('object+json')
  return res.end(JSON.stringify(isObject ? rows[0]??null : rows))
}
;(async()=>{
  const list = async () => renderToStaticMarkup(await HomePage())
  const detail = async code => renderToStaticMarkup(await StockDetailPage({params:{code}}))
  let body=await list()
  assert(body.includes('検証銘柄1004'))
  assert(body.includes('5.00%'))
  assert(requests.some(r=>r.offset==='500') && requests.some(r=>r.offset==='1000'))
  mode='singleRelation';body=await list();assert(body.includes('5.00%'));assert(body.includes('検証銘柄1004'))
  mode='nullRelation';body=await list();assert(body.includes('データなし'));assert(body.includes('検証銘柄1004'))
  mode='ok';body=await detail('1000')
  assert(body.includes('検証銘柄'))
  assert(body.includes('5.00'))
  assert(body.includes('低リスク'))
  assert(!body.includes('>90</span>'))
  assert(body.includes('>10</span>'))
  await assert.rejects(detail('9999'),error => error.digest === 'NEXT_NOT_FOUND')
  mode='missing';body=await detail('1000');assert(body.includes('データなし'));assert(!body.includes('つなぎ売り有効'))
  stock.min_investment=null;mode='ok';body=await detail('1000');assert(body.includes('最低投資額のデータなし'));assert(!body.includes('つなぎ売り有効'));stock.min_investment=100000
  mode='failed';await assert.rejects(list(), /取得できません/)
  await assert.rejects(detail('1000'),error=>error.digest!=='NEXT_NOT_FOUND')
  mode='relatedFailed';await assert.rejects(detail('1000'), /関連データ/)
  mode='pageFailed';await assert.rejects(list(), /取得できません/)
  mode='ok';body=await list();assert(body.includes('検証銘柄1004'))
  assert(renderToStaticMarkup(React.createElement(ErrorPage)).includes('再試行'))
  console.log('PASS: Supabase SDK → server components → rendered list/detail; 1005 rows, latest yields/risk, 404, missing data, initial/related/later-page failures, recovery')
})().catch(e=>{console.error(e);process.exitCode=1})
