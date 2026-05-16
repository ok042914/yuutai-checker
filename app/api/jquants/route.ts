import { NextRequest } from 'next/server'

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')
  const code = searchParams.get('code')

  if (!endpoint) {
    return Response.json({ error: 'endpoint parameter is required' }, { status: 400 })
  }

  if (!process.env.JQUANTS_API_KEY) {
    return Response.json({ error: 'JQUANTS_API_KEY is not configured' }, { status: 500 })
  }

  try {
    let data: unknown

    switch (endpoint) {
      case 'prices':
        if (!code) return Response.json({ error: 'code parameter is required for prices endpoint' }, { status: 400 })
        data = await jquantsFetch(`/prices/daily_quotes?code=${code}`)
        break

      case 'financials':
        if (!code) return Response.json({ error: 'code parameter is required for financials endpoint' }, { status: 400 })
        data = await jquantsFetch(`/fins/statements?code=${code}`)
        break

      case 'dividend':
        if (!code) return Response.json({ error: 'code parameter is required for dividend endpoint' }, { status: 400 })
        data = await jquantsFetch(`/fins/dividend?code=${code}`)
        break

      default:
        return Response.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 400 })
    }

    return Response.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
