export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-950">
      <div className="text-center space-y-6">
        {/* Logo / Título */}
        <img src="/logo-taco.png" alt="Taco" className="h-16 mx-auto" />
        <h1 className="text-4xl font-bold tracking-tight text-white font-display">
          Taco
        </h1>
        <p className="text-lg text-zinc-400 max-w-md">
          Plataforma de monitoramento e observabilidade para seus servicos
        </p>

        {/* Status indicators demo */}
        <div className="flex gap-4 justify-center mt-8">
          <span className="badge-up px-3 py-1 rounded-full text-sm font-medium">
            Online
          </span>
          <span className="badge-degraded px-3 py-1 rounded-full text-sm font-medium">
            Degradado
          </span>
          <span className="badge-down px-3 py-1 rounded-full text-sm font-medium">
            Offline
          </span>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <a
            href="/login"
            className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Entrar
          </a>
        </div>
      </div>
    </main>
  )
}
