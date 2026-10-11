'use client'

export default function ErrorPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center" role="alert">
      <h1 className="text-lg font-bold mb-3">データを取得できませんでした</h1>
      <p className="text-sm text-gray-500 mb-6">通信状況を確認して、もう一度お試しください。</p>
      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white rounded-lg px-5 py-2">再試行</button>
      <a href="/" className="block mt-4 text-sm text-blue-600">銘柄一覧へ戻る</a>
    </main>
  )
}
