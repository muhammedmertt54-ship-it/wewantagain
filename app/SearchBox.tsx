"use client";

import { FormEvent, useMemo, useState } from "react";

type Campaign = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
};

type SearchBoxProps = {
  campaigns: Campaign[];
};

export default function SearchBox({
  campaigns,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return [];
    }

    return campaigns
      .filter((campaign) => {
        const haystack = [
          campaign.title,
          campaign.subtitle,
          campaign.category,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(cleanQuery);
      })
      .slice(0, 6);
  }, [campaigns, query]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (results.length === 1) {
      window.location.href =
        `/campaign/${results[0].slug}`;

      return;
    }

    setOpen(true);
  }

  return (
    <div className="relative mx-auto mt-9 max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-violet-100"
      >
        <span className="px-3 text-xl">
          🔎
        </span>

        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent px-2 py-4 text-base outline-none"
          placeholder="Search a show, movie or game..."
          autoComplete="off"
        />

        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-6 py-4 font-bold text-white hover:bg-violet-700"
        >
          Search
        </button>
      </form>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm font-semibold text-slate-500">
              No campaigns found.
            </div>
          ) : (
            <div>
              {results.map((campaign) => (
                <a
                  key={campaign.slug}
                  href={`/campaign/${campaign.slug}`}
                  className="block border-b border-slate-100 p-5 transition last:border-b-0 hover:bg-violet-50"
                >
                  <div className="text-xs font-black uppercase tracking-wide text-violet-600">
                    {campaign.category}
                  </div>

                  <div className="mt-1 text-lg font-black text-slate-950">
                    {campaign.title}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    {campaign.subtitle}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}