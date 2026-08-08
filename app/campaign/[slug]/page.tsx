import SupportButton from "../SupportButton";
import ShareButtons from "../ShareButtons";

import { supabase } from "../../../lib/supabase";

type CampaignPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const campaigns: Record<
  string,
  {
    title: string;
    subtitle: string;
    supporters: string;
    progress: number;
    target: string;
    category: string;
    description: string;
  }
> = {
  "season-6": {
    title: "We Want Season 6",
    subtitle: "Example Series",
    supporters: "824,291",
    progress: 82,
    target: "Example Studios",
    category: "TV & Series",
    description:
      "Thousands of fans want the story to continue. This campaign brings supporters together in one place and shows the demand clearly.",
  },

  "season-4": {
    title: "We Want Season 4",
    subtitle: "Fantasy World",
    supporters: "612,233",
    progress: 61,
    target: "Fantasy Studios",
    category: "TV & Series",
    description:
      "The story is not finished yet. Fans from around the world want another season.",
  },

  sequel: {
    title: "We Want The Sequel",
    subtitle: "The Final Mission",
    supporters: "598,105",
    progress: 59,
    target: "Example Pictures",
    category: "Movies",
    description:
      "Fans want the story to continue with a new movie and a proper sequel.",
  },

  "part-2": {
    title: "We Want Part II",
    subtitle: "Ghost World",
    supporters: "487,920",
    progress: 48,
    target: "Example Games",
    category: "Games",
    description:
      "Players want another chapter, new content and a full continuation of the game.",
  },
};

export default async function CampaignPage({
  params,
}: CampaignPageProps) {
  const { slug } = await params;
  const campaign = campaigns[slug];
const { data: verifiedCount, error: countError } = await supabase.rpc(
  "get_verified_support_count",
  {
    p_campaign_slug: slug,
  }
);

const realSupporters = countError ? 0 : Number(verifiedCount ?? 0);
const { data: countryRows, error: countryError } = await supabase.rpc(
  "get_verified_support_countries",
  {
    p_campaign_slug: slug,
  }
);

const countries =
  countryError || !countryRows
    ? []
    : countryRows.map((row: { country: string; count: number }) => ({
        name: row.country,
        count: Number(row.count),
      }));
const goal = 1000000;
const realProgress = Math.min((realSupporters / goal) * 100, 100);

  if (!campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-10 text-center shadow">
          <h1 className="text-3xl font-black">Campaign not found</h1>
          <a href="/" className="mt-5 inline-block font-bold text-violet-600">
            ← Back to home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <div className="text-2xl font-black">
              WEWANT<span className="text-violet-600">AGAIN</span>
            </div>
            <div className="text-[10px] tracking-[0.2em] text-slate-500">
              YOUR VOICE. THEIR ATTENTION.
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold"
          >
            ← Home
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-2">
        <div className="flex min-h-[440px] items-end rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-700 p-8 text-white shadow-xl">
          <div>
            <div className="mb-3 inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-bold">
              {campaign.category}
            </div>

            <h2 className="text-5xl font-black">{campaign.subtitle}</h2>

            <p className="mt-3 text-lg text-white/70">
              Make your voice heard.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            🔥 TRENDING NOW
          </div>

          <h1 className="text-5xl font-black leading-tight">
            {campaign.title}
          </h1>

          <p className="mt-3 text-2xl font-bold text-violet-600">
            {campaign.subtitle}
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-black">
                 {realSupporters.toLocaleString()} 
                </div>
                <div className="text-sm text-slate-500">supporters</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-slate-500">Goal</div>
                <div className="text-xl font-black">1,000,000</div>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{ width: `${realProgress}%` }}
              />
            </div>

            <div className="mt-2 text-right text-sm font-bold text-violet-600">
              {realProgress < 0.01 && realSupporters > 0
  ? "<0.01"
  : realProgress.toFixed(2)}% of goal
            </div>
          </div>

          <SupportButton />

          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm text-slate-600">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              ✓ Email verified
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              ✓ Real people
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              ✓ Secure
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black">Why we want it back</h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            {campaign.description}
          </p>

          <div className="mt-8 border-t border-slate-100 pt-8">
            <h3 className="text-lg font-black">Target</h3>
            <div className="mt-3 rounded-xl bg-slate-50 p-5 font-bold">
              {campaign.target}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">Where supporters come from</h2>

            <div className="mt-5 space-y-4">
              {countries.length === 0 ? (
  <p className="text-sm text-slate-500">
    No verified supporters yet.
  </p>
) : (
  countries.map((item: { name: string; count: number }) => {
    const percent =
      realSupporters > 0
        ? (item.count / realSupporters) * 100
        : 0;

    return (
      <Country
        key={item.name}
        name={item.name}
        percent={Math.round(percent)}
      />
    );
  })
)}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">Share this campaign</h2>

            
 <ShareButtons />
</div>
</div>
</section>
</main> 
  );
}

function Country({
  name,
  percent,
}: {
  name: string;
  percent: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{name}</span>
        <span>{percent}%</span>
      </div>

      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}