"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function StartDemandPage() {
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] =
    useState("TV & Series");
  const [target, setTarget] = useState("");
  const [description, setDescription] =
    useState("");
  const [goal, setGoal] = useState("1000000");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [copyrightConfirmed, setCopyrightConfirmed] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [
    submissionsEnabled,
    setSubmissionsEnabled,
  ] = useState(true);

  const [
    availabilityMessage,
    setAvailabilityMessage,
  ] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  const previewUrl = useMemo(() => {
    if (!imageFile) {
      return "";
    }

    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href =
        "/signin?next=/start-demand";
      return;
    }

    const {
      data: settingsRow,
      error: settingsError,
    } = await supabase
      .from("site_settings")
      .select("settings")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Submission settings load error:",
        settingsError
      );

      setSubmissionsEnabled(false);
      setAvailabilityMessage(
        "Campaign submissions are temporarily unavailable."
      );

      setCheckingSession(false);
      return;
    }

    const siteSettings =
      settingsRow?.settings &&
      typeof settingsRow.settings === "object"
        ? (settingsRow.settings as Record<
            string,
            unknown
          >)
        : {};

    const enabled =
      siteSettings.submissions_enabled !== false;

    setSubmissionsEnabled(enabled);

    if (!enabled) {
      setAvailabilityMessage(
        "Campaign submissions are currently disabled by WeWantAgain."
      );
    } else {
      setAvailabilityMessage("");
    }

    setCheckingSession(false);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setMessage("");
    setSuccess(false);

    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageFile(null);
      event.target.value = "";

      setMessage(
        "Please upload a JPG, PNG or WebP image."
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImageFile(null);
      event.target.value = "";

      setMessage(
        "Image must be 5 MB or smaller."
      );

      return;
    }

    setImageFile(file);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!submissionsEnabled) {
      setMessage(
        availabilityMessage ||
          "Campaign submissions are currently disabled."
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      !session?.user ||
      !session.access_token
    ) {
      window.location.href =
        "/signin?next=/start-demand";
      return;
    }

    if (
      !title.trim() ||
      !subtitle.trim() ||
      !target.trim() ||
      !description.trim()
    ) {
      setMessage(
        "Please fill in all required fields."
      );
      return;
    }

    if (!imageFile) {
      setMessage(
        "Please upload a campaign image."
      );
      return;
    }

    if (!copyrightConfirmed) {
      setMessage(
        "Please confirm that you have the right to use this image."
      );
      return;
    }

    const numericGoal = Number(goal);

    if (
      !Number.isInteger(numericGoal) ||
      numericGoal < 1 ||
      numericGoal > 100000000
    ) {
      setMessage(
        "Please enter a valid supporter goal."
      );
      return;
    }

    setLoading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "subtitle",
        subtitle.trim()
      );

      formData.append(
        "category",
        category
      );

      formData.append(
        "target",
        target.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "goal",
        String(numericGoal)
      );

      formData.append(
        "copyright_confirmed",
        "true"
      );

      formData.append(
        "image",
        imageFile,
        imageFile.name
      );

      const response =
        await fetch(
          "/api/demands/submit",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: formData,
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        if (
          data?.code ===
          "SUBMISSIONS_DISABLED"
        ) {
          setSubmissionsEnabled(false);

          setAvailabilityMessage(
            data?.error ||
              "Campaign submissions are currently disabled."
          );
        }

        setMessage(
          data?.error ||
            "Campaign could not be created. Please try again."
        );

        return;
      }

      setSuccess(true);

      setMessage(
        data?.message ||
          "Your demand was submitted successfully. It will appear after review."
      );

      setTitle("");
      setSubtitle("");
      setCategory("TV & Series");
      setTarget("");
      setDescription("");
      setGoal("1000000");

      setImageFile(null);
      setCopyrightConfirmed(false);

      const fileInput =
        document.getElementById(
          "campaign-image"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error(
        "Campaign submission error:",
        error
      );

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Checking account...
        </div>
      </main>
    );
  }

  if (!submissionsEnabled) {
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

            <div className="flex gap-3">
              <a
                href="/account"
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
              >
                Account
              </a>

              <a
                href="/"
                className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
              >
                Home
              </a>
            </div>
          </div>
        </header>

        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-14">
          <div className="w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
              SUBMISSIONS PAUSED
            </div>

            <h1 className="mt-6 text-3xl font-black sm:text-4xl">
              New demands are temporarily unavailable.
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
              {availabilityMessage ||
                "Campaign submissions are currently disabled by WeWantAgain."}
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Existing campaigns remain available. Please check back later.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/"
                className="rounded-xl bg-violet-600 px-6 py-3 font-black text-white hover:bg-violet-700"
              >
                BACK TO WEBSITE
              </a>

              <a
                href="/account"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 hover:border-violet-300"
              >
                ACCOUNT
              </a>
            </div>
          </div>
        </section>
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

          <div className="flex gap-3">
            <a
              href="/account"
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
            >
              Account
            </a>

            <a
              href="/"
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold hover:border-violet-300"
            >
              Home
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            + START A DEMAND
          </div>

          <h1 className="text-4xl font-black sm:text-5xl">
            What do you want again?
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Submit a show, movie or game you
            want to see return. Every demand is
            reviewed before it becomes public.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"
        >
          <label className="block">
            <span className="text-sm font-black">
              Campaign image *
            </span>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Upload an image you created, own,
              have permission to use, or are
              otherwise legally allowed to use.
              JPG, PNG or WebP. Maximum 5 MB.
            </p>

            <input
              id="campaign-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="mt-3 block w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
              required
            />
          </label>

          {previewUrl && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="aspect-[16/9] w-full">
                <img
                  src={previewUrl}
                  alt="Campaign preview"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-4">
                <div className="font-black">
                  Image preview
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {imageFile?.name}
                </div>
              </div>
            </div>
          )}

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Demand title *
            </span>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Example: We Want Season 7"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
              required
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Show, movie or game name *
            </span>

            <input
              value={subtitle}
              onChange={(event) =>
                setSubtitle(
                  event.target.value
                )
              }
              placeholder="Example: Example Series"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
              required
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Category *
            </span>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-violet-500"
            >
              <option value="TV & Series">
                TV & Series
              </option>

              <option value="Movies">
                Movies
              </option>

              <option value="Games">
                Games
              </option>
            </select>
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Target company *
            </span>

            <input
              value={target}
              onChange={(event) =>
                setTarget(
                  event.target.value
                )
              }
              placeholder="Example: Netflix, HBO, Rockstar Games..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={100}
              required
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Why should it come back? *
            </span>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Explain why people want this show, movie or game to return..."
              className="mt-2 min-h-40 w-full resize-y rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              maxLength={1000}
              required
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-black">
              Supporter goal *
            </span>

            <input
              type="number"
              value={goal}
              onChange={(event) =>
                setGoal(
                  event.target.value
                )
              }
              min="1"
              max="100000000"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-violet-500"
              required
            />
          </label>

          <label className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <input
              type="checkbox"
              checked={
                copyrightConfirmed
              }
              onChange={(event) =>
                setCopyrightConfirmed(
                  event.target.checked
                )
              }
              className="mt-1 h-4 w-4"
              required
            />

            <span className="text-sm leading-6 text-amber-950">
              <strong>
                Image rights confirmation:
              </strong>{" "}
              I confirm that I created this
              image, own the necessary rights,
              have permission to use it, or am
              otherwise legally permitted to
              upload and publish it on
              WeWantAgain. I understand that
              content may be removed following
              a valid copyright complaint.
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
            className="mt-7 w-full rounded-xl bg-violet-600 py-4 text-lg font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "UPLOADING & SUBMITTING..."
              : "SUBMIT DEMAND"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            Submitted campaigns are reviewed
            before becoming public.
          </p>
        </form>
      </section>
    </main>
  );
}