import SupportButton from "../SupportButton";
import ShareButtons from "../ShareButtons";
import AdminCampaignControls from "../AdminCampaignControls";

import {
  supabase,
} from "../../../lib/supabase";

export const dynamic =
  "force-dynamic";

type CampaignPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CampaignPage({
  params,
}: CampaignPageProps) {
  const {
    slug,
  } =
    await params;

  const {
    data: campaign,
    error:
      campaignError,
  } =
    await supabase
      .from(
        "campaigns"
      )
      .select(
        "id, slug, title, subtitle, category, target, description, goal, status, image_url, image_removed"
      )
      .eq(
        "slug",
        slug
      )
      .eq(
        "status",
        "active"
      )
      .single();

  const {
    data:
      verifiedCount,

    error:
      countError,
  } =
    await supabase.rpc(
      "get_verified_support_count",
      {
        p_campaign_slug:
          slug,
      }
    );

  const realSupporters =
    countError
      ? 0
      : Number(
          verifiedCount ??
            0
        );

  const {
    data:
      countryRows,

    error:
      countryError,
  } =
    await supabase.rpc(
      "get_verified_support_countries",
      {
        p_campaign_slug:
          slug,
      }
    );

  const countries =
    countryError ||
    !countryRows
      ? []
      : countryRows.map(
          (
            row: {
              country: string;
              count: number;
            }
          ) => ({
            name:
              row.country,

            count:
              Number(
                row.count
              ),
          })
        );

  if (
    campaignError ||
    !campaign
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-950">
            Campaign not found
          </h1>

          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-violet-600 px-6 py-3 font-bold text-white"
          >
            ← Back to home
          </a>
        </div>
      </main>
    );
  }

  const goal =
    Number(
      campaign.goal ??
        1000000
    );

  const realProgress =
    goal > 0
      ? Math.min(
          (
            realSupporters /
            goal
          ) *
            100,
          100
        )
      : 0;

  const showImage =
    !!campaign.image_url &&
    campaign.image_removed !==
      true;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="block"
          >
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-xs font-bold tracking-[0.18em] text-slate-400">
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
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          {showImage ? (
            <div className="aspect-[16/10] w-full bg-slate-100">
              <img
                src={
                  campaign.image_url
                }
                alt={
                  campaign.subtitle
                }
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-700 p-8 text-center text-white">
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-white/60">
                  {
                    campaign.category
                  }
                </div>

                <div className="mt-3 text-4xl font-black">
                  {
                    campaign.subtitle
                  }
                </div>

                <p className="mt-3 text-white/60">
                  Campaign image unavailable
                </p>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="inline-block rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
              {
                campaign.category
              }
            </div>

            <h2 className="mt-4 text-3xl font-black">
              {
                campaign.subtitle
              }
            </h2>

            <p className="mt-2 text-slate-500">
              Make your voice heard.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            🔥 TRENDING NOW
          </div>

          <h1 className="text-5xl font-black leading-tight">
            {
              campaign.title
            }
          </h1>

          <p className="mt-3 text-2xl font-bold text-violet-600">
            {
              campaign.subtitle
            }
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-black">
                  {realSupporters.toLocaleString()}
                </div>

                <div className="text-sm text-slate-500">
                  supporters
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-slate-500">
                  Goal
                </div>

                <div className="text-xl font-black">
                  {goal.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{
                  width:
                    `${realProgress}%`,
                }}
              />
            </div>

            <div className="mt-2 text-right text-sm font-bold text-violet-600">
              {realProgress <
                0.01 &&
              realSupporters >
                0
                ? "<0.01"
                : realProgress.toFixed(
                    2
                  )}
              % of goal
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

      <AdminCampaignControls
        campaignId={
          Number(
            campaign.id
          )
        }
        campaignTitle={
          campaign.title
        }
      />

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-black">
            Why we want it back
          </h2>

          <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-slate-600">
            {
              campaign.description
            }
          </p>

          <div className="mt-8 border-t border-slate-100 pt-8">
            <h3 className="text-lg font-black">
              Target
            </h3>

            <div className="mt-3 rounded-xl bg-slate-50 p-5 font-bold">
              {
                campaign.target
              }
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">
              Where supporters come from
            </h2>

            <div className="mt-5 space-y-4">
              {countries.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  No verified supporters yet.
                </p>
              ) : (
                countries.map(
                  (
                    item: {
                      name: string;
                      count: number;
                    }
                  ) => {
                    const percent =
                      realSupporters >
                      0
                        ? (
                            item.count /
                            realSupporters
                          ) *
                          100
                        : 0;

                    return (
                      <Country
                        key={
                          item.name
                        }
                        name={
                          item.name
                        }
                        percent={Math.round(
                          percent
                        )}
                      />
                    );
                  }
                )
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">
              Share this campaign
            </h2>

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
      <div className="flex justify-between text-sm">
        <span>
          {name}
        </span>

        <span className="font-bold">
          {percent}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600"
          style={{
            width:
              `${percent}%`,
          }}
        />
      </div>
    </div>
  );
}