
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function VerifyPage() {
  const [status, setStatus] = useState("E-posta doğrulanıyor...");
  const [success, setSuccess] = useState(false);
  const [campaignSlug, setCampaignSlug] = useState("");

  useEffect(() => {
    async function verifySupport() {
      try {
        const params = new URLSearchParams(window.location.search);

        const campaign = params.get("campaign");
        const code = params.get("code");

        if (!campaign) {
          setStatus("Kampanya bilgisi bulunamadı.");
          return;
        }

        setCampaignSlug(campaign);

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(exchangeError);

            setStatus(
              "E-posta doğrulaması tamamlanamadı. Lütfen bağlantıyı tekrar aç."
            );

            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          setStatus(
            "E-posta doğrulaması tamamlanamadı. Lütfen maildeki bağlantıyı tekrar aç."
          );
          return;
        }

        const email = session.user.email.trim().toLowerCase();

        const { error } = await supabase
          .from("supports")
          .update({
            verified: true,
          })
          .eq("email", email)
          .eq("campaign_slug", campaign);

        if (error) {
          console.error(error);
          setStatus("Destek doğrulanırken bir hata oluştu.");
          return;
        }

        setSuccess(true);
        setStatus("Desteğin başarıyla doğrulandı!");
      } catch (error) {
        console.error(error);
        setStatus("Beklenmeyen bir hata oluştu.");
      }
    }

    verifySupport();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <a href="/" className="inline-block">
          <div className="text-3xl font-black tracking-tight text-slate-950">
            WEWANT
            <span className="text-violet-600">AGAIN</span>
          </div>
        </a>

        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-4xl">
          {success ? "✓" : "✉"}
        </div>

        <h1 className="mt-6 text-2xl font-black text-slate-950">
          {status}
        </h1>

        {success && (
          <>
            <p className="mt-3 text-slate-500">
              Desteğin kampanyanın doğrulanmış destekçi sayısına dahil edildi.
            </p>

            {campaignSlug && (
              <a
                href={`/campaign/${encodeURIComponent(campaignSlug)}`}
                className="mt-7 inline-block rounded-xl bg-violet-600 px-8 py-4 font-black text-white hover:bg-violet-700"
              >
                KAMPANYAYA DÖN
              </a>
            )}

            <div>
              <a
                href="/"
                className="mt-4 inline-block font-bold text-slate-500 hover:text-violet-600"
              >
                Ana sayfaya dön
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}