"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type SiteSettings = {
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  hero_primary_button: string;
  hero_secondary_button: string;

  trending_title: string;
  most_wanted_title: string;
  categories_title: string;

  footer_text: string;

  submissions_enabled: boolean;
  support_enabled: boolean;
  maintenance_mode: boolean;
};

const defaultSettings: SiteSettings = {
  hero_badge: "🌍 Make your voice heard worldwide",

  hero_title:
    "Bring back the shows, movies and games you love.",

  hero_description:
    "Create and support community campaigns for the entertainment you want to see again.",

  hero_primary_button:
    "START A DEMAND",

  hero_secondary_button:
    "BROWSE CAMPAIGNS",

  trending_title:
    "🔥 TRENDING NOW",

  most_wanted_title:
    "🏆 MOST WANTED",

  categories_title:
    "★ BROWSE BY CATEGORY",

  footer_text:
    "Independent community platform",

  submissions_enabled: true,
  support_enabled: true,
  maintenance_mode: false,
};

export default function AdminSitePage() {
  const [settings, setSettings] =
    useState<SiteSettings>(
      defaultSettings
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return (
      session?.access_token ??
      null
    );
  }

  async function loadSettings() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const token =
      await getToken();

    if (!token) {
      window.location.href =
        "/admin";

      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/site-settings",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          window.location.href =
            "/admin";

          return;
        }

        setErrorMessage(
          data?.error ??
            "Site settings could not be loaded."
        );

        return;
      }

      if (data?.settings) {
        setSettings({
          ...defaultSettings,
          ...data.settings,
        });
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Site settings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setMessage("");
    setErrorMessage("");
    setSaving(true);

    const token =
      await getToken();

    if (!token) {
      setErrorMessage(
        "Admin session expired."
      );

      setSaving(false);

      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/site-settings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                settings,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.details
            ? `${
                data?.error ??
                "Save failed."
              } ${data.details}`
            : data?.error ??
                "Site settings could not be saved."
        );

        return;
      }

      setMessage(
        "Site settings saved successfully."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Site settings could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateText(
    key: keyof SiteSettings,
    value: string
  ) {
    setSettings(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function updateBoolean(
    key: keyof SiteSettings,
    value: boolean
  ) {
    setSettings(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="font-black text-violet-600">
          Loading site settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-2xl font-black">
              WEWANT
              <span className="text-violet-600">
                AGAIN
              </span>
            </div>

            <div className="text-xs font-bold tracking-widest text-slate-400">
              ADMIN / SITE MANAGEMENT
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black hover:border-violet-300"
            >
              ← Admin Panel
            </a>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black hover:border-violet-300"
            >
              Open Website
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div>
          <div className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
            ⚙ SITE SETTINGS
          </div>

          <h1 className="mt-4 text-4xl font-black">
            Site Management
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Control public site text and platform-wide switches
            from the admin panel.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 font-bold text-green-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {/* PLATFORM SWITCHES */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">
            Platform Controls
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Global switches for important site functions.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ToggleCard
              title="Campaign submissions"
              description="Allow users to create new demands."
              checked={
                settings.submissions_enabled
              }
              onChange={(value) =>
                updateBoolean(
                  "submissions_enabled",
                  value
                )
              }
            />

            <ToggleCard
              title="Campaign support"
              description="Allow visitors to support campaigns."
              checked={
                settings.support_enabled
              }
              onChange={(value) =>
                updateBoolean(
                  "support_enabled",
                  value
                )
              }
            />

            <ToggleCard
              title="Maintenance mode"
              description="Temporarily put the public site into maintenance mode."
              checked={
                settings.maintenance_mode
              }
              danger
              onChange={(value) =>
                updateBoolean(
                  "maintenance_mode",
                  value
                )
              }
            />
          </div>
        </section>

        {/* HERO */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">
            Homepage Hero
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Main text visitors see when opening the website.
          </p>

          <div className="mt-6 grid gap-6">
            <TextField
              label="Hero badge"
              value={
                settings.hero_badge
              }
              onChange={(value) =>
                updateText(
                  "hero_badge",
                  value
                )
              }
            />

            <TextAreaField
              label="Hero title"
              value={
                settings.hero_title
              }
              maxLength={180}
              onChange={(value) =>
                updateText(
                  "hero_title",
                  value
                )
              }
            />

            <TextAreaField
              label="Hero description"
              value={
                settings.hero_description
              }
              maxLength={500}
              onChange={(value) =>
                updateText(
                  "hero_description",
                  value
                )
              }
            />

            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Primary button"
                value={
                  settings.hero_primary_button
                }
                onChange={(value) =>
                  updateText(
                    "hero_primary_button",
                    value
                  )
                }
              />

              <TextField
                label="Secondary button"
                value={
                  settings.hero_secondary_button
                }
                onChange={(value) =>
                  updateText(
                    "hero_secondary_button",
                    value
                  )
                }
              />
            </div>
          </div>
        </section>

        {/* SECTIONS */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">
            Homepage Sections
          </h2>

          <div className="mt-6 grid gap-5">
            <TextField
              label="Trending title"
              value={
                settings.trending_title
              }
              onChange={(value) =>
                updateText(
                  "trending_title",
                  value
                )
              }
            />

            <TextField
              label="Most Wanted title"
              value={
                settings.most_wanted_title
              }
              onChange={(value) =>
                updateText(
                  "most_wanted_title",
                  value
                )
              }
            />

            <TextField
              label="Categories title"
              value={
                settings.categories_title
              }
              onChange={(value) =>
                updateText(
                  "categories_title",
                  value
                )
              }
            />
          </div>
        </section>

        {/* FOOTER */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">
            Footer
          </h2>

          <div className="mt-6">
            <TextField
              label="Footer text"
              value={
                settings.footer_text
              }
              onChange={(value) =>
                updateText(
                  "footer_text",
                  value
                )
              }
            />
          </div>
        </section>

        {/* PREVIEW */}
        <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50 p-6 sm:p-8">
          <div className="text-xs font-black uppercase tracking-widest text-violet-500">
            Preview
          </div>

          <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-violet-700">
            {settings.hero_badge}
          </div>

          <h2 className="mt-5 max-w-4xl text-4xl font-black">
            {settings.hero_title}
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            {settings.hero_description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white">
              {
                settings.hero_primary_button
              }
            </div>

            <div className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black">
              {
                settings.hero_secondary_button
              }
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 mt-8">
          <button
            type="button"
            onClick={
              saveSettings
            }
            disabled={saving}
            className="w-full rounded-2xl bg-violet-600 px-6 py-5 text-lg font-black text-white shadow-xl shadow-violet-200 hover:bg-violet-700 disabled:opacity-60"
          >
            {saving
              ? "SAVING..."
              : "SAVE SITE SETTINGS"}
          </button>
        </div>
      </section>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-violet-500 focus:bg-white"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-black">
          {label}
        </span>

        <span className="text-xs font-bold text-slate-400">
          {value.length}/
          {maxLength}
        </span>
      </div>

      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-violet-500 focus:bg-white"
      />
    </label>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  danger = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean
  ) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className={`rounded-2xl border p-5 text-left transition ${
        checked
          ? danger
            ? "border-red-300 bg-red-50"
            : "border-green-300 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="font-black">
          {title}
        </div>

        <div
          className={`rounded-full px-3 py-1 text-xs font-black ${
            checked
              ? danger
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {checked
            ? "ON"
            : "OFF"}
        </div>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </button>
  );
}