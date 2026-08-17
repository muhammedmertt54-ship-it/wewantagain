import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-bold text-slate-500 transition hover:text-violet-600"
        >
          ← Back to WeWantAgain
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-violet-700">
            Contact
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight">
            Contact WeWantAgain
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Use the contact channels below for general support,
            payment questions, privacy requests, copyright reports
            and other platform-related matters.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-black uppercase tracking-wider text-violet-600">
                General support
              </div>

              <h2 className="mt-3 text-xl font-black">
                Help with your account or the platform
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Contact us for account issues, campaign questions,
                technical problems or general platform support.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Support email:</strong>
                <div className="mt-1">
                  General support contact is not yet published.
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-black uppercase tracking-wider text-violet-600">
                Payments
              </div>

              <h2 className="mt-3 text-xl font-black">
                Supporter payment questions
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                For payment, cancellation or refund questions,
                include your payment ID and the email address linked
                to your WeWantAgain account when possible.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Payment support email:</strong>
                <div className="mt-1">
                  Paid Supporter services are currently disabled, so payment support is not active.
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-black uppercase tracking-wider text-violet-600">
                Privacy
              </div>

              <h2 className="mt-3 text-xl font-black">
                Personal data requests
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Privacy-related requests can be submitted using the
                designated privacy contact address.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Privacy email:</strong>
                <div className="mt-1">
                  A dedicated privacy contact channel will be published before broader public launch.
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-black uppercase tracking-wider text-violet-600">
                Copyright
              </div>

              <h2 className="mt-3 text-xl font-black">
                Rights-holder requests
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Copyright and intellectual property concerns can also
                be submitted through WeWantAgain&apos;s copyright
                reporting process.
              </p>

              <Link
                href="/copyright"
                className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Copyright reporting
              </Link>
            </section>
          </div>

          <section className="mt-10 rounded-3xl border border-slate-200 p-6 sm:p-8">
            <h2 className="text-2xl font-black">
              Legal operator information
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              The information below identifies the person or legal
              entity responsible for operating WeWantAgain and,
              where paid Supporter services are offered, the merchant
              responsible for those services.
            </p>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <strong>
                Verified operator and merchant information must be
                published here before paid Supporter services are activated.
              </strong>

              <div className="mt-4 space-y-3">
                <div>
                  <span className="font-black">
                    Legal operator / merchant:
                  </span>{" "}
                  Not yet published. Paid Supporter services remain disabled until verified operator information is available.
                </div>

                <div>
                  <span className="font-black">
                    Business / correspondence address:
                  </span>{" "}
                  Not yet published.
                </div>

                <div>
                  <span className="font-black">
                    Contact email:
                  </span>{" "}
                  Not yet published.
                </div>

                <div>
                  <span className="font-black">
                    Phone:
                  </span>{" "}
                  Not currently published.
                </div>

                <div>
                  <span className="font-black">
                    Tax / registration information:
                  </span>{" "}
                  Not currently published.
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="font-black text-red-900">
              Payment security
            </div>

            <p className="mt-2 text-sm leading-6 text-red-800">
              Do not send complete card numbers, card security codes,
              online banking passwords or other sensitive payment
              credentials through email or contact messages.
            </p>
          </section>

          <div className="mt-12 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap gap-4 text-sm font-bold">
              <Link
                href="/terms"
                className="text-violet-600 hover:text-violet-800"
              >
                Terms of Service
              </Link>

              <Link
                href="/privacy"
                className="text-violet-600 hover:text-violet-800"
              >
                Privacy Policy
              </Link>

              <Link
                href="/refund"
                className="text-violet-600 hover:text-violet-800"
              >
                Refund Policy
              </Link>

              <Link
                href="/support"
                className="text-violet-600 hover:text-violet-800"
              >
                Supporter Program
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}