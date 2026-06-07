"use client";

import { useMemo, useState } from "react";
import { SongCard } from "@/components/SongCard";
import type { Song, StemType } from "@/lib/types";

type SongLibraryProps = {
  songs: Song[];
};

const stemFilters: Array<{ label: string; value: "all" | StemType }> = [
  { label: "All", value: "all" },
  { label: "Vocals", value: "vocals" },
  { label: "Guitar", value: "guitar" },
  { label: "Drums", value: "drums" },
  { label: "Bass", value: "bass" },
  { label: "Keys", value: "keys" }
];

export function SongLibrary({ songs }: SongLibraryProps) {
  const [query, setQuery] = useState("");
  const [stemType, setStemType] = useState<"all" | StemType>("all");

  const filteredSongs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        song.title.toLowerCase().includes(normalizedQuery) ||
        song.artist?.toLowerCase().includes(normalizedQuery);
      const matchesStem =
        stemType === "all" || song.stems.some((stem) => stem.type === stemType);

      return matchesQuery && matchesStem;
    });
  }, [query, songs, stemType]);

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a song"
              className="mt-2 w-full rounded border border-white/10 bg-ink px-3 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amberline"
            />
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Stem
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stemFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStemType(filter.value)}
                  className={`rounded border px-3 py-2 text-sm font-semibold ${
                    stemType === filter.value
                      ? "border-amberline bg-amberline text-ink"
                      : "border-white/10 bg-rail text-stone-200 hover:border-amberline/70"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-400">
          {filteredSongs.length} of {songs.length} songs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSongs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </section>
  );
}
