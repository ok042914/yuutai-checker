const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
const Module = require('node:module')
const resolve = Module._resolveFilename
Module._resolveFilename = function(id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.join(__dirname, '..', id.slice(2)) : id, ...args) }
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
const { fetchAllPages, latestRow, latestFinancial, combinedYield, filterStocks, relationRows } = require('../lib/stock-data.ts')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const card = require('../components/StockCard.tsx').default
const recovery = require('../components/RecoveryPattern.tsx').default
const base = {code:'1000',name:'テストＡ',summary:'ＱＵＯカード',kakutei_month:'3月末、9月末',yuutai_yield:3,dividend_yield:2,min_investment:100000,risk_score:null,risk_icon:'⚪',timing_signal:'watch',timing_label:'様子見',financial_updated_at:null}
;(async () => {
  for (const count of [0, 499, 500, 1000, 1005]) {
    const dataset = Array.from({length:count}, (_,i)=>i)
    const calls=[]
    assert.deepEqual(await fetchAllPages(async (from,to)=>{calls.push([from,to]);return dataset.slice(from,to+1)}),dataset)
    assert.equal(calls.length, Math.floor(count/500)+1)
  }
  await assert.rejects(fetchAllPages(async from=>{if(from) throw Error('failed');return Array(500).fill(0)}))
  assert.equal(latestRow([{at:null},{at:'2026-01-01'},{at:'2025-01-01'}],'at').at,'2026-01-01')
  assert.equal(latestFinancial([{year:2025,updated_at:'2026-01-01',value:1},{year:2026,updated_at:'2026-01-02',value:2},{year:2026,updated_at:'2026-01-03',value:3}]).value,3)
  assert.deepEqual(relationRows(null), [])
  assert.deepEqual(relationRows(undefined), [])
  assert.deepEqual(relationRows({value:1}), [{value:1}])
  assert.deepEqual(relationRows([{value:1},{value:2}]), [{value:1},{value:2}])
  assert.equal(latestRow({at:'2026-01-01'},'at').at,'2026-01-01')
  assert.equal(latestRow(null,'at'), null)
  assert.equal(latestFinancial(null), null)
  assert.equal(latestFinancial({year:2026,updated_at:null,value:1}).value,1)
  assert.equal(combinedYield(null,6),null)
  assert.equal(combinedYield(0,0),0)
  assert.equal(filterStocks([base], 'テストa','9月末',true).length,1)
  assert.equal(filterStocks([base], 'ＱＵＯ','all',false).length,1)
  assert.equal(filterStocks([base], '１０００','all',false).length,1)
  assert.equal(filterStocks([base], 'テストＡ','2月末',true).length,0)
  assert.equal(filterStocks([{...base,dividend_yield:null,yuutai_yield:8}], '', 'all',true).length,0)
  assert.equal(filterStocks([{...base,name:'',summary:''}], 'unknown','all',false).length,0)
  assert.equal(filterStocks([base], '前テストa後','all',false).length,0)
  assert.equal(filterStocks([{...base,name:'テスト…'}], 'テスト株式会社','all',false).length,1)
  assert.match(renderToStaticMarkup(React.createElement(card,{stock:{...base,yuutai_yield:0,dividend_yield:0}})), /0\.00%/)
  assert.match(renderToStaticMarkup(React.createElement(card,{stock:{...base,dividend_yield:null}})), /データなし/)
  assert.match(renderToStaticMarkup(React.createElement(recovery,{data:[{kakutei_date:'2026-03-31',drop_rate:null,recovery_1w:null,recovery_1m:null,recovery_3m:null,recovery_days:5},{kakutei_date:'2025-03-31',drop_rate:null,recovery_1w:null,recovery_1m:null,recovery_3m:null,recovery_days:null}]})), /判定不可/)
  console.log('PASS: pagination, page errors, latest records, filters, normalization, zero/missing yields, recovery uncertainty')
})().catch(e=>{console.error(e);process.exitCode=1})
