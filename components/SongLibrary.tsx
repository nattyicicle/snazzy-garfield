"use client";

import { useMemo, useState } from "react";
import { SongCard } from "@/components/SongCard";
import type { Song, StemType } from "@/lib/types";

type SongLibraryProps = {
  songs: Song[];
};

type LibrarySection = "released" | "unreleased" | "other";

type SongGroup = {
  album: string;
  songs: Song[];
};

type LibraryGroup = {
  section: LibrarySection;
  groups: SongGroup[];
  count: number;
};

const stemFilters: Array<{ label: string; value: "all" | StemType }> = [
  { label: "All", value: "all" },
  { label: "Vocals", value: "vocals" },
  { label: "Guitar", value: "guitar" },
  { label: "Drums", value: "drums" },
  { label: "Bass", value: "bass" },
  { label: "Keys", value: "keys" }
];

const sectionLabels: Record<LibrarySection, string> = {
  released: "Released",
  unreleased: "Unreleased",
  other: "Other"
};

const sectionOrder: LibrarySection[] = ["released", "unreleased", "other"];

function prettifyPathPart(value: string | undefined) {
  if (!value) {
    return "Singles";
  }

  return decodeURIComponent(value)
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSongPlacement(song: Song) {
  const pathParts = song.stems[0]?.file.split("/").filter(Boolean) ?? [];
  const libraryIndex = pathParts.indexOf("song-library");
  const section = pathParts[libraryIndex + 1] as LibrarySection | undefined;
  const album = prettifyPathPart(pathParts[libraryIndex + 2]);

  if (section === "released" || section === "unreleased") {
    return { section, album };
  }

  return { section: "other" as const, album };
}

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

  const groupedSongs = useMemo<LibraryGroup[]>(() => {
    const sections = new Map<LibrarySection, Map<string, Song[]>>();

    for (const song of filteredSongs) {
      const { section, album } = getSongPlacement(song);
      const sectionGroups = sections.get(section) ?? new Map<string, Song[]>();
      const albumSongs = sectionGroups.get(album) ?? [];

      albumSongs.push(song);
      sectionGroups.set(album, albumSongs);
      sections.set(section, sectionGroups);
    }

    return sectionOrder
      .map((section) => {
        const groups = sections.get(section);

        if (!groups) {
          return null;
        }

        const sortedGroups = [...groups.entries()]
          .map(([album, albumSongs]) => ({
            album,
            songs: albumSongs.sort((a, b) => a.title.localeCompare(b.title))
          }))
          .sort((a, b) => a.album.localeCompare(b.album));

        return {
          section,
          groups: sortedGroups,
          count: sortedGroups.reduce(
            (total, group) => total + group.songs.length,
            0
          )
        };
      })
      .filter((group): group is LibraryGroup => group !== null);
  }, [filteredSongs]);

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

      <div className="flex flex-col gap-8">
        {groupedSongs.map((section) => (
          <section key={section.section} className="flex flex-col gap-4">
            <div className="flex items-end justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
                  {sectionLabels[section.section]}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {section.count} song{section.count === 1 ? "" : "s"}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {section.groups.map((group) => (
                <section
                  key={`${section.section}-${group.album}`}
                  className="flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-stone-100">
                      {group.album}
                    </h3>
                    <span className="text-sm text-stone-500">
                      {group.songs.length} song
                      {group.songs.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.songs.map((song) => (
                      <SongCard key={song.id} song={song} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
