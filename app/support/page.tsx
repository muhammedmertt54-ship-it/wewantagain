"use client";

const supporterTiers = [
  {
    name: "Supporter",
    badge: "SUPPORTER",
    price: "₺25+",
    description:
      "Show your support for WeWantAgain with permanent profile recognition.",
    perks: [
      "Supporter profile badge",
      "Supporters Wall eligibility",
      "Support history on your account",
    ],
  },
  {
    name: "Backer",
    badge: "BACKER",
    price: "₺100+",
    description:
      "Stand out with additional cosmetic supporter benefits.",
    perks: [
      "Everything in Supporter",
      "Special profile styling",
      "Backer profile badge",
      "Selected feature previews",
    ],
  },
  {
    name: "Champion",
    badge: "CHAMPION",
    price: "₺250+",
    description:
      "The highest supporter tier with premium community recognition.",
    perks: [
      "Everything in Backer",
      "Champion profile badge",
      "Premium supporter frame",
      "Priority preview access",
    ],
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="inline-flex text-sm font-bold text-slate-500 transition hover:text-violet-600"
        >
          ← Back to website
        </a>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-6 py-12 text-white sm:px-10">
            <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest">
              WeWantAgain Supporters
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black sm:text-5xl">
              Become a WeWantAgain Supporter.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-violet-100">
              Support the development and operation of WeWantAgain while
              receiving digital supporter benefits on your account.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <section className="rounded-3xl border border-amber-300 bg-amber-50 p-7 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
                🔒
              </div>

              <div className="mt-5 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-800">
                Payments Temporarily Unavailable
              </div>

              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-black text-slate-950">
                Our payment provider is currently not active.
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                We are currently preparing our secure payment system.
                Please wait for this page to be activated before sending
                your support.
              </p>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                No payment can currently be submitted through WeWantAgain.
                Supporter status will only be activated after verified
                payment processing becomes available.
              </p>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-5 text-sm font-bold text-amber-900">
                Payment checkout is disabled until our payment provider is
                fully configured and activated.
              </div>
            </section>

            <div className="mt-12">
              <div className="text-sm font-black uppercase tracking-widest text-violet-600">
                Supporter benefits
              </div>

              <h2 className="mt-2 text-3xl font-black">
                Supporter levels will be available when payments open.
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                Supporter benefits are cosmetic and community focused.
                They do not increase campaign voting or support power.
              </p>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {supporterTiers.map((tier) => (
                <article
                  key={tier.name}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black tracking-wide text-violet-700">
                      {tier.badge}
                    </div>

                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-700">
                      {tier.price}
                    </div>
                  </div>

                  <h3 className="mt-4 text-2xl font-black">
                    {tier.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {tier.description}
                  </p>

                  <div className="mt-5 space-y-3">
                    {tier.perks.map((perk) => (
                      <div
                        key={perk}
                        className="flex gap-3 text-sm font-bold text-slate-700"
                      >
                        <span className="text-green-600">
                          ✓
                        </span>

                        <span>
                          {perk}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="font-black text-slate-950">
                What happens when payments are activated?
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Once our payment provider becomes active, this page will
                allow you to choose a supporter amount and complete payment
                through a secure payment checkout.
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Payment details will be handled by the payment provider.
                WeWantAgain will not directly store your card information.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/supporters"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                View Supporters Wall
              </a>

              <a
                href="/account"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:text-violet-600"
              >
                Back to Account
              </a>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-400">
              Supporter benefits do not provide additional campaign influence,
              votes or guaranteed outcomes.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}