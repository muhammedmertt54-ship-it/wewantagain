export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <a href="/">
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">AGAIN</span>
            </div>

            <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
              YOUR VOICE. THEIR ATTENTION.
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
          >
            ← Home
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            ABOUT WEWANTAGAIN
          </div>

          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Your voice. Their attention.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            WeWantAgain is a community platform where people can create and
            support campaigns for shows, movies and games they would like to
            see return, continue or receive a new installment.
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="text-2xl font-black">
                How it works
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Users can submit a demand, choose a category, explain why they
                want it to return and upload a campaign image. Submitted
                campaigns are reviewed before becoming publicly available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Community support
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Visitors can support public campaigns. Email verification helps
                us reduce duplicate or automated support and provides a clearer
                picture of genuine community interest.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Independent platform
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                WeWantAgain is an independent fan and community platform.
                Unless explicitly stated, it is not affiliated with, endorsed
                by or sponsored by the studios, publishers, streaming services,
                game developers or other companies mentioned in user-created
                campaigns.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                User-created content
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Campaign titles, descriptions and uploaded images may be
                submitted by users. Users are responsible for ensuring that
                they have the necessary rights or permission for content they
                upload.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Our goal
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Our goal is simple: create one place where communities can
                clearly show what they want to see again.
              </p>
            </section>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <a
              href="/terms"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Terms
            </a>

            <a
              href="/privacy"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Privacy
            </a>

            <a
              href="/copyright"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Copyright
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}