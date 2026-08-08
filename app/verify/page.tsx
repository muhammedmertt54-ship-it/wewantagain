"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function VerifyPage() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("E-posta doğrulanıyor...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifySupport() {
      try {
        const campaign = searchParams.get("campaign");
        const code = searchParams.get("code");

        if (!campaign) {
          setStatus("Kampanya bilgisi bulunamadı.");
          return;
        }

        // Supabase bazı doğrulama linklerinde ?code= gönderir.
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(exchangeError);
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

        const email = session.user.email.toLowerCase();

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
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-violet-50 to-white px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="text-3xl font-black">
          WEWANT<span className="text-violet-600">AGAIN</span>
        </div>

        <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-4xl">
          {success ? "✓" : "✉"}
        </div>

        <h1 className="mt-6 text-2xl font-black text-slate-950">
          {status}
        </h1>

        {success && (
          <>
            <p className="mt-3 text-slate-500">
              Artık desteğin kampanyanın gerçek destekçi sayısına dahil edilebilir.
            </p>

            <a
              href="/"
              className="mt-7 inline-block rounded-xl bg-violet-600 px-8 py-4 font-black text-white hover:bg-violet-700"
            >
              ANA SAYFAYA DÖN
            </a>
          </>
        )}
      </div>
    </main>
  );
}