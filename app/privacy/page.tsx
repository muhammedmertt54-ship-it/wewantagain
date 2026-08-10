export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <a href="/">
            <div className="text-2xl font-black tracking-tight">
              WEWANT
              <span className="text-violet-600">AGAIN</span>
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
            PRIVACY POLICY
          </div>

          <h1 className="mt-5 text-4xl font-black sm:text-5xl">
            Privacy at WeWantAgain
          </h1>

          <p className="mt-4 text-sm font-semibold text-slate-400">
            Last updated: August 10, 2026
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            This Privacy Policy explains what information WeWantAgain may
            collect, why it is used, and the choices available to users of the
            platform.
          </p>

          <div className="mt-10 space-y-9">
            <section>
              <h2 className="text-2xl font-black">
                1. Information we collect
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                When you create an account, sign in, submit a campaign or
                support a demand, WeWantAgain may process information such as
                your email address, username, display name, user ID, campaign
                submissions, uploaded images, country selection and support
                activity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                2. Authentication information
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Account authentication is handled through our authentication
                provider. Users may sign in using email and password or
                supported third-party login providers such as Google.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                3. Campaign submissions
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Information submitted when creating a public campaign may
                become publicly visible after moderation. This can include the
                campaign title, category, description, target company and
                uploaded campaign image.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                4. Support verification
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Email addresses may be used to verify campaign support and help
                reduce duplicate or automated activity. Verified support may be
                associated with a signed-in WeWantAgain account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                5. How we use information
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Information may be used to operate accounts, publish and
                moderate campaigns, verify support, prevent abuse, secure the
                service, improve WeWantAgain and respond to valid legal or
                copyright-related requests.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                6. Uploaded images
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Campaign images uploaded by users may be stored and displayed
                publicly. Users must have the necessary rights or permission to
                upload and publish those images. Content may be removed after
                moderation or a valid rights complaint.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                7. Service providers
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                WeWantAgain relies on third-party infrastructure and service
                providers for functions such as hosting, authentication,
                databases, file storage and sign-in services. Those providers
                may process limited information necessary to provide their
                services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                8. Security
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                We use technical and administrative measures intended to protect
                accounts and platform data. However, no online service can
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                9. Account controls
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Users can access their account area to view account information
                and change supported profile settings. Additional account
                controls may be added as the platform develops.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                10. Account and content removal
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Accounts or content may be restricted or removed where needed
                for security, moderation, legal compliance, abuse prevention or
                enforcement of the WeWantAgain Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                11. Changes to this policy
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                This policy may be updated as WeWantAgain changes. The latest
                version will be published on this page with an updated date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black">
                12. Contact and rights requests
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Privacy, account-data or content-related requests can be
                submitted through the contact methods WeWantAgain makes
                available. Copyright complaints should use the dedicated
                Copyright / Takedown process.
              </p>
            </section>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <a
              href="/about"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              About
            </a>

            <a
              href="/terms"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Terms
            </a>

            <a
              href="/copyright"
              className="rounded-xl border border-slate-200 p-4 text-center font-black hover:border-violet-300 hover:text-violet-600"
            >
              Copyright
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}