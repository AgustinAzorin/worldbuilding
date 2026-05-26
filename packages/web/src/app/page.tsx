import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          World<span className="text-blue-600">building</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
          Creá mundos ficticios ricos con artículos interconectados,
          lore dinámico y referencias cruzadas en tiempo real.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/worlds"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Explorar mis mundos
          </Link>
          <Link
            href="/auth/sign-up"
            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  )
}
