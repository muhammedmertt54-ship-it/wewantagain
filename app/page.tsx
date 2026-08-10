import Header from "./Header";
import SearchBox from "./SearchBox";
import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

type Campaign = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  target: string;
  description: string;
  goal: number;
  supporters: number;
  image_url: string | null;
  image_removed: boolean;
};

type HomeProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function Home({
  searchParams,
}: HomeProps) {
  const params = await searchParams;

  const selectedCategory =
    typeof params.category === "string"
      ? params.category
      : "";

  const { data: campaignRows, error: campaignError } =
    await supabase
      .from("campaigns")
      .select(
        "slug, title, subtitle, category, target, description, goal, status, created_at, image_url, image_removed"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

  const rawCampaigns =
    campaignError || !campaignRows
      ? []
      : campaignRows;

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
        image_url: campaign.image_url ?? null,
        image_removed:
          campaign.image_removed === true,
      };
    })
  );

  const visibleCampaigns = selectedCategory
    ? campaigns.filter(
        (campaign) =>
          campaign.category === selectedCategory
      )
    : campaigns;

  const trending = [...visibleCampaigns]
    .sort(
      (a, b) =>
        b.supporters - a.supporters
    )
    .slice(0, 4);

  const mostWanted = [...visibleCampaigns]
    .sort(
      (a, b) =>
        b.supporters - a.supporters
    )
    .slice(0, 5);

  const totalSupporters = campaigns.reduce(
    (total, campaign) =>
      total + campaign.supporters,
    0
  );

  const searchCampaigns = campaigns.map(
    (campaign) => ({
      slug: campaign.slug,
      title: campaign.title,
      subtitle: campaign.subtitle,
      category: campaign.category,
    })
  );

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-b from-violet-50 via-indigo-50/70 to-white">
        <div className="absolute left-[-100px] top-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute right-[-80px] top-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-4 inline-flex rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            ?? Make your voice heard worldwide
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            WHAT DO YOU
            <br />
            WANT{" "}
            <span className="text-violet-600">
              AGAIN?
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Support the shows, movies and games
            you want to see return. Together,
            your voice becomes impossible to
            ignore.
          </p>

          <SearchBox campaigns={searchCampaigns} />

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
                ?
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

      {selectedCategory && (
        <section className="mx-auto max-w-7xl px-6 pt-10">
          <div className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-violet-500">
                CATEGORY FILTER
              </div>

              <div className="mt-1 text-xl font-black text-violet-800">
                {selectedCategory}
              </div>
            </div>

            <a
              href="/#campaigns"
              className="rounded-xl bg-white px-5 py-3 text-center font-black text-violet-700 shadow-sm"
            >
              Show All Campaigns
            </a>
          </div>
        </section>
      )}

      {/* TRENDING */}
      <section
        id="trending"
        className="scroll-mt-24 mx-auto max-w-7xl px-6 py-12"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">
              ?? TRENDING NOW
            </h2>

            {selectedCategory && (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {selectedCategory}
              </p>
            )}
          </div>

          <a
            href="#campaigns"
            className="font-semibold text-slate-500 hover:text-violet-600"
          >
            View all ?
          </a>
        </div>

        {trending.length === 0 ? (
          <EmptyCampaigns />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {trending.map((item, index) => {
              const progress =
                item.goal > 0
                  ? Math.min(
                      (item.supporters /
                        item.goal) *
                        100,
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
                    <CampaignImage
                      campaign={item}
                      badge={index + 1}
                    />

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
                          {progress < 0.01 &&
                          item.supporters > 0
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
                        ? SUPPORT
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
      <section
        id="most-wanted"
        className="scroll-mt-24 mx-auto max-w-7xl px-6 pb-12"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black">
            ?? MOST WANTED
          </h2>

          <a
            href="#campaigns"
            className="font-semibold text-slate-500 hover:text-violet-600"
          >
            View all ?
          </a>
        </div>

        {mostWanted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            No campaigns yet.
          </div>
        ) : (
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-5">
            {mostWanted.map((item, index) => (
              <a
                key={item.slug}
                href={`/campaign/${item.slug}`}
                className="border-b border-slate-100 transition hover:bg-violet-50 last:border-0 md:border-b-0 md:border-r"
              >
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  {item.image_url &&
                  !item.image_removed ? (
                    <img
                      src={item.image_url}
                      alt={item.subtitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-violet-800 p-4 text-center font-black text-white">
                      {item.subtitle}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 p-5">
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
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ALL CAMPAIGNS */}
      <section
        id="campaigns"
        className="scroll-mt-24 mx-auto max-w-7xl px-6 pb-12"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-black">
            ??{" "}
            {selectedCategory
              ? `${selectedCategory} Campaigns`
              : "ALL CAMPAIGNS"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {visibleCampaigns.length} active
            campaign
            {visibleCampaigns.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {visibleCampaigns.length === 0 ? (
          <EmptyCampaigns />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCampaigns.map(
              (campaign) => (
                <a
                  key={campaign.slug}
                  href={`/campaign/${campaign.slug}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-violet-300 hover:shadow-lg"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    {campaign.image_url &&
                    !campaign.image_removed ? (
                      <img
                        src={
                          campaign.image_url
                        }
                        alt={
                          campaign.subtitle
                        }
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-700 p-6 text-center text-white">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-white/60">
                            {
                              campaign.category
                            }
                          </div>

                          <div className="mt-2 text-2xl font-black">
                            {
                              campaign.subtitle
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="text-xs font-black uppercase tracking-wide text-violet-600">
                      {campaign.category}
                    </div>

                    <h3 className="mt-2 text-xl font-black">
                      {campaign.title}
                    </h3>

                    <p className="mt-1 font-bold text-slate-500">
                      {campaign.subtitle}
                    </p>

                    <div className="mt-5 font-black">
                      {campaign.supporters.toLocaleString()}{" "}
                      supporters
                    </div>
                  </div>
                </a>
              )
            )}
          </div>
        )}
      </section>

      {/* CATEGORIES */}
      <section
        id="categories"
        className="scroll-mt-24 mx-auto max-w-7xl px-6 pb-12"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">
            ? BROWSE BY CATEGORY
          </h2>

          <a
            href="/#campaigns"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black hover:border-violet-300 hover:text-violet-600"
          >
            All Campaigns
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Category
            emoji="??"
            title="TV & SERIES"
            description="Bring back cancelled shows or demand new seasons."
            gradient="from-violet-950 to-indigo-700"
            href="/?category=TV%20%26%20Series#campaigns"
          />

          <Category
            emoji="??"
            title="MOVIES"
            description="Demand sequels, prequels or the return of legends."
            gradient="from-orange-950 to-red-700"
            href="/?category=Movies#campaigns"
          />

          <Category
            emoji="??"
            title="GAMES"
            description="Push for sequels, comebacks or the features you want."
            gradient="from-emerald-950 to-teal-700"
            href="/?category=Games#campaigns"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-violet-200 bg-violet-50 px-8 py-8 md:flex-row">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-violet-300 bg-white text-3xl">
              ?
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Want something back that
                isn&apos;t here?
              </h2>

              <p className="mt-1 text-slate-600">
                Create your own demand and rally
                thousands of supporters.
              </p>
            </div>
          </div>

          <a
            href="/start-demand"
            className="rounded-xl bg-violet-600 px-8 py-4 font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
          >
            + START A DEMAND
          </a>
        </div>
      </section>

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
          </div>

          <div>
            <h3 className="font-black">
              Explore
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <a
                href="/#trending"
                className="block hover:text-violet-600"
              >
                Trending
              </a>

              <a
                href="/#most-wanted"
                className="block hover:text-violet-600"
              >
                Most Wanted
              </a>

              <a
                href="/#campaigns"
                className="block hover:text-violet-600"
              >
                All Campaigns
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-black">
              Categories
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <a
                href="/?category=TV%20%26%20Series#campaigns"
                className="block hover:text-violet-600"
              >
                TV & Series
              </a>

              <a
                href="/?category=Movies#campaigns"
                className="block hover:text-violet-600"
              >
                Movies
              </a>

              <a
                href="/?category=Games#campaigns"
                className="block hover:text-violet-600"
              >
                Games
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-black">
              WeWantAgain
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <a
                href="/about"
                className="block hover:text-violet-600"
              >
                About
              </a>

              <a
                href="/privacy"
                className="block hover:text-violet-600"
              >
                Privacy
              </a>

              <a
                href="/terms"
                className="block hover:text-violet-600"
              >
                Terms
              </a>

              <a
                href="/copyright"
                className="block hover:text-violet-600"
              >
                Copyright / Takedown
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function CampaignImage({
  campaign,
  badge,
}: {
  campaign: Campaign;
  badge: number;
}) {
  const showImage =
    !!campaign.image_url &&
    !campaign.image_removed;

  return (
    <div className="relative h-48 overflow-hidden bg-slate-100">
      {showImage ? (
        <img
          src={campaign.image_url!}
          alt={campaign.subtitle}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-end bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-700 p-5 text-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/70">
              {campaign.category}
            </div>

            <div className="mt-1 text-2xl font-black">
              {campaign.subtitle}
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 rounded-lg bg-violet-600 px-3 py-1 text-sm font-black text-white shadow">
        {badge}
      </div>
    </div>
  );
}

function EmptyCampaigns() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
      <div className="text-4xl">
        ??
      </div>

      <h3 className="mt-4 text-xl font-black">
        No campaigns yet
      </h3>

      <p className="mt-2 text-slate-500">
        Be the first to start a demand.
      </p>

      <a
        href="/start-demand"
        className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-4 font-black text-white"
      >
        + START A DEMAND
      </a>
    </div>
  );
}

function Category({
  emoji,
  title,
  description,
  gradient,
  href,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: string;
  href: string;
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

      <a
        href={href}
        className="mt-6 inline-block rounded-xl bg-white/10 px-5 py-3 font-bold backdrop-blur hover:bg-white/20"
      >
        Browse ?
      </a>
    </div>
  );
}
