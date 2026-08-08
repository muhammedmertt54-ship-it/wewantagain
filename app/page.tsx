import { supabase } from "../lib/supabase";

type Campaign = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  target: string;
  description: string;
  goal: number;
  supporters: number;
};

const gradients = [
  "from-indigo-950 via-purple-800 to-indigo-500",
  "from-slate-950 via-slate-700 to-cyan-700",
  "from-blue-950 via-violet-800 to-purple-500",
  "from-orange-950 via-red-900 to-slate-900",
];

export default async function Home() {
  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select(
      "slug, title, subtitle, category, target, description, goal, status, created_at"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const rawCampaigns = campaignError || !campaignRows ? [] : campaignRows;

  const campaigns: Campaign[] = await Promise.all(
    rawCampaigns.map(async (campaign) => {
      const { data: count } = await supabase.rpc(
        "get_verified_support_count",
        {
          p_campaign_slug: campaign.slug,
        }
      );

      return {
        slug: campaign.slug,
        title: campaign.title,
        subtitle: campaign.subtitle,
        category: campaign.category,
        target: campaign.target,
        description: campaign.description,
        goal: Number(campaign.goal ?? 1000000),
        supporters: Number(count ?? 0),
      };
    })
  );

  const trending = [...campaigns]
    .sort((a, b) => b.supporters - a.supporters)
    .slice(0, 4);

  const mostWanted = [...campaigns]
    .sort((a, b) => b.supporters - a.supporters)
    .slice(0, 5);

  const totalSupporters = campaigns.reduce(
    (total, campaign) => total + campaign.supporters,
    0
  );

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">AGAIN</span>
            </div>

            <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
              YOUR VOICE. THEIR ATTENTION.
            </div>
          </a>

          <nav className="hidden items-center gap-8 font-semibold md:flex">
            <a href="#categories" className="hover:text-violet-600">
              📺 TV & Series
            </a>

            <a href="#categories" className="hover:text-violet-600">
              🎬 Movies
            </a>

            <a href="#categories" className="hover:text-violet-600">
              🎮 Games
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-xl border border-slate-200 px-5 py-3 font-semibold sm:block">
              Sign In
            </button>

            <button className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700">
              + Start a Demand
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-b from-violet-50 via-indigo-50/70 to-white">
        <div className="absolute left-[-100px] top-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="absolute right-[-80px] top-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-4 inline-flex rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            🌍 Make your voice heard worldwide
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            WHAT DO YOU
            <br />
            WANT <span className="text-violet-600">AGAIN?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Support the shows, movies and games you want to see return.
            Together, your voice becomes impossible to ignore.
          </p>

          <div className="mx-auto mt-9 flex max-w-3xl items-center rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-violet-100">
            <span className="px-3 text-xl">🔎</span>

            <input
              className="w-full bg-transparent px-2 py-4 text-base outline-none"
              placeholder="Search a show, movie or game..."
            />

            <button className="rounded-xl bg-violet-600 px-6 py-4 font-bold text-white hover:bg-violet-700">
              Search
            </button>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-black text-violet-700">
                {totalSupporters.toLocaleString()}
              </div>

              <div className="text-sm text-slate-500">
                Supporters
              </div>
            </div>

            <div>
              <div className="text-2xl font-black text-violet-700">
                —
              </div>

              <div className="text-sm text-slate-500">
                Countries
              </div>
            </div>

            <div>
              <div className="text-2xl font-black text-violet-700">
                {campaigns.length}
              </div>

              <div className="text-sm text-slate-500">
                Campaigns
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            🔥 TRENDING NOW
          </h2>

          <button className="font-semibold text-slate-500 hover:text-violet-600">
            View all →
          </button>
        </div>

        {trending.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            No campaigns yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {trending.map((item, index) => {
              const progress =
                item.goal > 0
                  ? Math.min(
                      (item.supporters / item.goal) * 100,
                      100
                    )
                  : 0;

              return (
                <a
                  key={item.slug}
                  href={`/campaign/${item.slug}`}
                  className="block"
                >
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <div
                      className={`relative flex h-48 items-end bg-gradient-to-br ${
                        gradients[index % gradients.length]
                      } p-5 text-white`}
                    >
                      <div className="absolute left-4 top-4 rounded-lg bg-violet-600 px-3 py-1 text-sm font-black">
                        {index + 1}
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                          {item.category}
                        </div>

                        <div className="mt-1 text-2xl font-black">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-black">
                        {item.title}
                      </h3>

                      <p className="mt-1 font-semibold text-violet-600">
                        {item.subtitle}
                      </p>

                      <div className="mt-5 flex items-end justify-between">
                        <div>
                          <div className="text-lg font-black">
                            {item.supporters.toLocaleString()}
                          </div>

                          <div className="text-xs text-slate-500">
                            supporters
                          </div>
                        </div>

                        <div className="font-bold text-violet-600">
                          {progress < 0.01 && item.supporters > 0
                            ? "<0.01"
                            : progress.toFixed(2)}
                          %
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-5 w-full rounded-xl border-2 border-violet-500 py-3 text-center font-black text-violet-600 transition hover:bg-violet-600 hover:text-white">
                        ♥ SUPPORT
                      </div>
                    </div>
                  </article>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* MOST WANTED */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            🏆 MOST WANTED
          </h2>

          <button className="font-semibold text-slate-500 hover:text-violet-600">
            View all →
          </button>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-5">
          {mostWanted.map((item, index) => (
            <a
              key={item.slug}
              href={`/campaign/${item.slug}`}
              className="flex gap-4 border-b border-slate-100 p-5 transition hover:bg-violet-50 last:border-0 md:border-b-0 md:border-r"
            >
              <div className="text-3xl font-black text-slate-300">
                {index + 1}
              </div>

              <div>
                <div className="text-sm font-black">
                  {item.title}
                </div>

                <div className="mt-2 font-bold">
                  {item.supporters.toLocaleString()}
                </div>

                <div className="text-xs text-slate-500">
                  supporters
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section
        id="categories"
        className="mx-auto max-w-7xl px-6 pb-12"
      >
        <h2 className="mb-6 text-2xl font-black">
          ★ BROWSE BY CATEGORY
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          <Category
            emoji="📺"
            title="TV & SERIES"
            description="Bring back cancelled shows or demand new seasons."
            gradient="from-violet-950 to-indigo-700"
          />

          <Category
            emoji="🎬"
            title="MOVIES"
            description="Demand sequels, prequels or the return of legends."
            gradient="from-orange-950 to-red-700"
          />

          <Category
            emoji="🎮"
            title="GAMES"
            description="Push for sequels, comebacks or the features you want."
            gradient="from-emerald-950 to-teal-700"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-violet-200 bg-violet-50 px-8 py-8 md:flex-row">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-violet-300 bg-white text-3xl">
              ♡
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Want something back that isn&apos;t here?
              </h2>

              <p className="mt-1 text-slate-600">
                Create your own demand and rally thousands of supporters.
              </p>
            </div>
          </div>

          <button className="rounded-xl bg-violet-600 px-8 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700">
            + START A DEMAND
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
          <div>
            <div className="text-2xl font-black">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Your Voice. Their Attention.
            </p>

            <p className="mt-5 text-sm">
              A{" "}
              <span className="font-black text-violet-600">
                TIYACOOL
              </span>{" "}
              project.
            </p>
          </div>

          <div>
            <h3 className="font-black">Explore</h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>Trending</p>
              <p>Most Wanted</p>
              <p>Categories</p>
            </div>
          </div>

          <div>
            <h3 className="font-black">Categories</h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>TV & Series</p>
              <p>Movies</p>
              <p>Games</p>
            </div>
          </div>

          <div>
            <h3 className="font-black">WeWantAgain</h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>About</p>
              <p>Privacy</p>
              <p>Terms</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Category({
  emoji,
  title,
  description,
  gradient,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-lg`}
    >
      <div className="text-4xl">
        {emoji}
      </div>

      <h3 className="mt-5 text-2xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-white/70">
        {description}
      </p>

      <button className="mt-6 rounded-xl bg-white/10 px-5 py-3 font-bold backdrop-blur hover:bg-white/20">
        Browse →
      </button>
    </div>
  );
}