import type { StockCardData } from '@/components/StockCard'

export async function fetchAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>, pageSize = 500): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const page = await fetchPage(rows.length, rows.length + pageSize - 1)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

/** PostgREST returns one-to-one relations as an object and one-to-many relations as arrays. */
export function relationRows<T>(value: T | T[] | null | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value]
}

export function latestRow<T extends object>(rows: T | T[] | null | undefined, key: keyof T): T | null {
  return [...relationRows(rows)].sort((a, b) => String(b[key] ?? '').localeCompare(String(a[key] ?? '')))[0] ?? null
}

export function latestFinancial<T extends { year: number | null; updated_at: string | null }>(rows: T | T[] | null | undefined): T | null {
  return [...relationRows(rows)].sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity)
    || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0] ?? null
}

export function combinedYield(yuutai: number | null, dividend: number | null): number | null {
  return yuutai === null || dividend === null ? null : yuutai + dividend
}

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().trim()

export function filterStocks(stocks: StockCardData[], search: string, month: string, highYield: boolean): StockCardData[] {
  const query = normalize(search)
  return stocks.filter(stock => {
    const name = normalize(stock.name).replace(/(?:\.{3}|…)$/, '')
    const matchesSearch = !query || (name.length > 0 && (name.includes(query)
      || (/…$|\.{3}$/.test(stock.name) && query.startsWith(name))))
      || normalize(stock.code).includes(query) || normalize(stock.summary).includes(query)
    const months = (stock.kakutei_month ?? '').split(/[、,，/\s]+/)
    const matchesMonth = month === 'all' || months.includes(month)
    const total = combinedYield(stock.yuutai_yield, stock.dividend_yield)
    return matchesSearch && matchesMonth && (!highYield || (total !== null && total >= 5))
  })
}
