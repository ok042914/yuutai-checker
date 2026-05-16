const JQUANTS_BASE = 'https://api.jquants.com/v1'

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options)
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      continue
    }
    return res
  }
  throw new Error('Rate limit exceeded after retries')
}

export async function jquantsFetch(endpoint: string) {
  const res = await fetchWithRetry(
    `${JQUANTS_BASE}${endpoint}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.JQUANTS_API_KEY}`
      }
    }
  )
  if (!res.ok) throw new Error(`J-Quants API error: ${res.status}`)
  return res.json()
}

export async function getStockPrice(code: string) {
  return jquantsFetch(`/prices/daily_quotes?code=${code}`)
}

export async function getFinancials(code: string) {
  return jquantsFetch(`/fins/statements?code=${code}`)
}

export async function getDividend(code: string) {
  return jquantsFetch(`/fins/dividend?code=${code}`)
}
