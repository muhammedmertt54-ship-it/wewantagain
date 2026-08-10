"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Campaign = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  target: string;
  description: string;
  goal: number;
  status: "pending" | "active" | "rejected";
  created_at: string;
  image_url: string | null;
  image_removed: boolean;
};

export default function MyDemandsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMyDemands();
  }, []);

  async function loadMyDemands() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/signin?next=/my-demands";
      return;
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, slug, title, subtitle, category, target, description, goal, status, created_at, image_url, image_removed"
      )
      .eq("created_by", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Your demands could not be loaded.");
      setLoading(false);
      return;
    }

    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  }

  function statusStyle(status: Campaign["status"]) {
    if (status === "active") {
      return "bg-green-100 text-green-700";
    }

    if (status === "rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  function statusText(status: Campaign["status"]) {
    if (status === "active") {
      return "APPROVED";
    }

    if (status === "rejected") {
      return "REJECTED";
    }

    return "PENDING REVIEW";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading your demands...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
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

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
              📣 MY DEMANDS
            </div>

            <h1 className="mt-4 text-4xl font-black">
              Your campaigns
            </h1>

            <p className="mt-2 text-slate-500">
              Track the review status of campaigns you submitted.
            </p>
          </div>

          <a
            href="/start-demand"
            className="rounded-xl bg-violet-600 px-6 py-4 text-center font-black text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
          >
            + START A DEMAND
          </a>
        </div>

        {message && (
          <div className="mt-8 rounded-xl bg-red-50 p-4 font-bold text-red-700">
            {message}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              📣
            </div>

            <h2 className="mt-5 text-2xl font-black">
              No demands yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              Create your first demand and submit it for review.
            </p>

            <a
              href="/start-demand"
              className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-4 font-black text-white"
            >
              + START A DEMAND
            </a>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {campaigns.map((campaign) => {
              const showImage =
                !!campaign.image_url &&
                !campaign.image_removed;

              return (
                <article
                  key={campaign.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                    <div className="min-h-[220px] bg-slate-100">
                      {showImage ? (
                        <img
                          src={campaign.image_url!}
                          alt={campaign.subtitle}
                          className="h-full min-h-[220px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-700 p-8 text-center text-white">
                          <div>
                            <div className="text-xs font-black uppercase tracking-widest text-white/60">
                              {campaign.category}
                            </div>

                            <div className="mt-3 text-2xl font-black">
                              {campaign.subtitle}
                            </div>

                            <div className="mt-3 text-sm text-white/50">
                              Image unavailable
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                              {campaign.category}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle(
                                campaign.status
                              )}`}
                            >
                              {statusText(campaign.status)}
                            </span>
                          </div>

                          <h2 className="mt-4 text-2xl font-black">
                            {campaign.title}
                          </h2>

                          <p className="mt-1 text-lg font-bold text-violet-600">
                            {campaign.subtitle}
                          </p>

                          <p className="mt-4 max-w-2xl whitespace-pre-wrap leading-7 text-slate-600">
                            {campaign.description}
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase text-slate-400">
                                Target
                              </div>

                              <div className="mt-1 font-black">
                                {campaign.target}
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase text-slate-400">
                                Goal
                              </div>

                              <div className="mt-1 font-black">
                                {Number(
                                  campaign.goal
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 text-xs text-slate-400">
                            Submitted:{" "}
                            {new Date(
                              campaign.created_at
                            ).toLocaleString()}
                          </div>
                        </div>

                        <div className="w-full sm:w-auto">
                          {campaign.status === "active" && (
                            <a
                              href={`/campaign/${campaign.slug}`}
                              className="block rounded-xl bg-violet-600 px-5 py-3 text-center font-black text-white hover:bg-violet-700"
                            >
                              VIEW CAMPAIGN
                            </a>
                          )}

                          {campaign.status === "pending" && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-black text-amber-700">
                              WAITING FOR REVIEW
                            </div>
                          )}

                          {campaign.status === "rejected" && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-center text-sm font-black text-red-700">
                              NOT APPROVED
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}