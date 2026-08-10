"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type SupportRow = {
  campaign_slug: string;
  verified: boolean;
};

type Campaign = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  image_url: string | null;
  image_removed: boolean;
};

export default function SupportedDemandsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSupportedDemands();
  }, []);

  async function loadSupportedDemands() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href =
        "/signin?next=/supported-demands";
      return;
    }

    const { data: supportRows, error: supportError } =
      await supabase
        .from("supports")
        .select("campaign_slug, verified")
        .eq("user_id", session.user.id)
        .eq("verified", true);

    if (supportError) {
      console.error(supportError);

      setMessage(
        "Supported campaigns could not be loaded."
      );

      setLoading(false);
      return;
    }

    const uniqueSlugs = [
      ...new Set(
        ((supportRows ?? []) as SupportRow[])
          .map((row) => row.campaign_slug)
          .filter(Boolean)
      ),
    ];

    if (uniqueSlugs.length === 0) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    const { data: campaignRows, error: campaignError } =
      await supabase
        .from("campaigns")
        .select(
          "slug, title, subtitle, category, image_url, image_removed"
        )
        .in("slug", uniqueSlugs)
        .eq("status", "active");

    if (campaignError) {
      console.error(campaignError);

      setMessage(
        "Supported campaigns could not be loaded."
      );

      setLoading(false);
      return;
    }

    setCampaigns(
      (campaignRows ?? []) as Campaign[]
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading supported demands...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/">
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">
              YOUR VOICE. THEIR ATTENTION.
            </div>
          </a>

          <a
            href="/account"
            className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
          >
            ← Account
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            ♥ SUPPORTED DEMANDS
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Campaigns you support
          </h1>

          <p className="mt-2 text-slate-500">
            Verified campaigns you have supported
            will appear here.
          </p>
        </div>

        {message && (
          <div className="mt-8 rounded-xl bg-red-50 p-4 font-bold text-red-700">
            {message}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              ♥
            </div>

            <h2 className="mt-5 text-2xl font-black">
              No supported demands yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              When you support a campaign and verify
              your email, it will appear here.
            </p>

            <a
              href="/#campaigns"
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-4 font-black text-white hover:bg-violet-700"
            >
              BROWSE CAMPAIGNS
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const showImage =
                !!campaign.image_url &&
                !campaign.image_removed;

              return (
                <a
                  key={campaign.slug}
                  href={`/campaign/${campaign.slug}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    {showImage ? (
                      <img
                        src={campaign.image_url!}
                        alt={campaign.subtitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-700 p-6 text-center text-white">
                        <div>
                          <div className="text-xs font-black uppercase tracking-widest text-white/60">
                            {campaign.category}
                          </div>

                          <div className="mt-2 text-2xl font-black">
                            {campaign.subtitle}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="text-xs font-black uppercase tracking-wide text-violet-600">
                      {campaign.category}
                    </div>

                    <h2 className="mt-2 text-xl font-black">
                      {campaign.title}
                    </h2>

                    <p className="mt-1 font-bold text-slate-500">
                      {campaign.subtitle}
                    </p>

                    <div className="mt-5 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      ✓ VERIFIED SUPPORT
                    </div>

                    <div className="mt-5 font-black text-violet-600">
                      View campaign →
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}