export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-medium text-emerald-400">
            Liara Hackathon
          </p>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Liara Docs Copilot
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Ask questions about Liara services and get grounded answers from
            official documentation.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
          <div className="min-h-64 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              Conversation will appear here.
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              placeholder="Ask something about Liara..."
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
            />

            <button
              type="button"
              className="rounded-xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
