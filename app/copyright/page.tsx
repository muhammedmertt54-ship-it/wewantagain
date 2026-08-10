"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CopyrightPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [disputedContent, setDisputedContent] = useState("");
  const [relationship, setRelationship] = useState("");
  const [accuracyConfirmed, setAccuracyConfirmed] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    if (
      !fullName.trim() ||
      !cleanEmail ||
      !campaignUrl.trim() ||
      !workDescription.trim() ||
      !disputedContent.trim() ||
      !relationship.trim()
    ) {
      setMessage(
        "Please complete all required fields."
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setMessage(
        "Please enter a valid email address."
      );
      return;
    }

    if (!accuracyConfirmed) {
      setMessage(
        "Please confirm that the information in your report is accurate."
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("copyright_reports")
      .insert({
        full_name: fullName.trim(),
        email: cleanEmail,
        campaign_url: campaignUrl.trim(),
        work_description:
          workDescription.trim(),
        disputed_content:
          disputedContent.trim(),
        relationship:
          relationship.trim(),
        accuracy_confirmed: true,
        status: "pending",
      });

    setLoading(false);

    if (error) {
      console.error(error);

      setMessage(
        "Your report could not be submitted. Please try again."
      );

      return;
    }

    setSuccess(true);

    setMessage(
      "Your copyright report was submitted successfully and will be reviewed."
    );

    setFullName("");
    setEmail("");
    setCampaignUrl("");
    setWorkDescription("");
    setDisputedContent("");
    setRelationship("");
    setAccuracyConfirmed(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
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
            COPYRIGHT & TAKEDOWN
          </div>

          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Copyright complaints
          </h1>

          <p className="mt-4 text-sm font-semibold text-slate-400">
            Last updated: August 10, 2026
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            WeWantAgain respects intellectual
            property rights. Campaigns and images
            may be submitted by users, and content
            that infringes another party&apos;s
            rights may be removed after review.
          </p>

          <div className="mt-10 space-y-9">
            <section>
              <h2 className="text-2xl font-black">
                User-uploaded content
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Users who upload campaign images
                must confirm that they created the
                image, own the necessary rights,
                have permission to use it, or are
                otherwise legally permitted to
                publish it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Reporting content
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                If you are a rights holder or are
                authorized to act on behalf of one
                and believe content on WeWantAgain
                infringes your rights, you may
                submit a takedown request below.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-black text-amber-950">
                Before submitting
              </h2>

              <p className="mt-3 leading-7 text-amber-950/80">
                Please identify the campaign and
                disputed material as clearly as
                possible. Do not knowingly submit
                false or misleading complaints.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Submit a takedown request
              </h2>

              <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8"
              >
                <label className="block">
                  <span className="text-sm font-black">
                    Full name *
                  </span>

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    maxLength={100}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 block">
                  <span className="text-sm font-black">
                    Contact email *
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="rights-holder@example.com"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 block">
                  <span className="text-sm font-black">
                    Campaign URL *
                  </span>

                  <input
                    type="url"
                    value={campaignUrl}
                    onChange={(event) =>
                      setCampaignUrl(
                        event.target.value
                      )
                    }
                    placeholder="https://wewantagain.../campaign/..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 block">
                  <span className="text-sm font-black">
                    Copyrighted work or protected material *
                  </span>

                  <textarea
                    value={workDescription}
                    onChange={(event) =>
                      setWorkDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describe the original work or material you own or represent."
                    maxLength={2000}
                    className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 block">
                  <span className="text-sm font-black">
                    Disputed content *
                  </span>

                  <textarea
                    value={disputedContent}
                    onChange={(event) =>
                      setDisputedContent(
                        event.target.value
                      )
                    }
                    placeholder="Identify the image, text or other content you want reviewed."
                    maxLength={2000}
                    className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 block">
                  <span className="text-sm font-black">
                    Your relationship to the rights holder *
                  </span>

                  <textarea
                    value={relationship}
                    onChange={(event) =>
                      setRelationship(
                        event.target.value
                      )
                    }
                    placeholder="Example: I am the rights holder / I am authorized to act on behalf of..."
                    maxLength={1000}
                    className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
                    required
                  />
                </label>

                <label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                  <input
                    type="checkbox"
                    checked={
                      accuracyConfirmed
                    }
                    onChange={(event) =>
                      setAccuracyConfirmed(
                        event.target.checked
                      )
                    }
                    className="mt-1"
                    required
                  />

                  <span className="text-sm leading-6 text-slate-600">
                    I confirm that the
                    information in this report is
                    accurate to the best of my
                    knowledge and that I am
                    submitting this request in
                    good faith.
                  </span>
                </label>

                {message && (
                  <div
                    className={`mt-6 rounded-xl p-4 text-center text-sm font-bold ${
                      success
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-7 w-full rounded-xl bg-violet-600 py-4 font-black text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {loading
                    ? "SUBMITTING..."
                    : "SUBMIT TAKEDOWN REQUEST"}
                </button>
              </form>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                What happens after a report?
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                WeWantAgain may review the
                reported material and may
                temporarily restrict, remove or
                disable access to an image or
                campaign where appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                Campaign removal
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Removing an image does not
                necessarily require removing the
                entire campaign. Where
                appropriate, WeWantAgain may
                remove only the disputed image
                while allowing the community
                campaign to remain available.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-8">
            <p className="text-sm leading-6 text-slate-500">
              This reporting system is intended
              to help WeWantAgain review
              rights-related complaints and is
              not legal advice.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <a
              href="/about"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              About
            </a>

            <a
              href="/privacy"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Privacy
            </a>

            <a
              href="/terms"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Terms
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}