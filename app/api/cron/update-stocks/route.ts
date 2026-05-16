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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
