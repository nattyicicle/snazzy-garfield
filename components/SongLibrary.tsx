"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { AlbumCard } from "@/components/AlbumCard";
import {
  getAlbums,
  getSongPlacement,
  sectionLabels,
  sectionOrder
} from "@/lib/albums";
import type { Album, ReleaseSection } from "@/lib/albums";
import type { SongSummary, StemType } from "@/lib/types";

type SongLibraryProps = {
  songs: SongSummary[];
};

type MaterialFilter = "all" | "reference" | "sheet" | "lyrics" | "mixer";
type ViewMode = "expanded" | "condensed";

const stemFilters: Array<{ label: string; value: "all" | StemType }> = [
  { label: "All", value: "all" },
  { label: "Vocals", value: "vocals" },
  { label: "Guitar", value: "guitar" },
  { label: "Drums", value: "drums" },
  { label: "Bass", value: "bass" },
  { label: "Keys", value: "keys" }
];

const materialFilters: Array<{ label: string; value: MaterialFilter }> = [
  { label: "All", value: "all" },
  { label: "Reference", value: "reference" },
  { label: "Sheet", value: "sheet" },
  { label: "Lyrics", value: "lyrics" },
  { label: "Mixer", value: "mixer" }
];

function filterSongs(
  songs: SongSummary[],
  material: MaterialFilter,
  query: string,
  stemType: "all" | StemType
) {
  const normalizedQuery = query.trim().toLowerCase();

  return songs.filter((song) => {
    const placement = getSongPlacement(song);
    const matchesQuery =
      normalizedQuery.length === 0 ||
      song.title.toLowerCase().includes(normalizedQuery) ||
      song.artist?.toLowerCase().includes(normalizedQuery) ||
      placement.title.toLowerCase().includes(normalizedQuery);
    const matchesStem =
      stemType === "all" || song.stemTypes.includes(stemType);
    const matchesMaterial =
      material === "all" ||
      (material === "reference" && song.hasReferenceAudio) ||
      (material === "sheet" && song.hasChordSheet) ||
      (material === "lyrics" && song.hasLyrics) ||
      (material === "mixer" && song.stemCount > 0);

    return matchesQuery && matchesStem && matchesMaterial;
  });
}

function groupAlbumsBySection(albums: Album<SongSummary>[]) {
  return sectionOrder
    .map((section) => {
      const sectionAlbums = albums.filter((album) => album.section === section);

      if (sectionAlbums.length === 0) {
        return null;
      }

      return {
        section,
        albums: sectionAlbums,
        count: sectionAlbums.reduce(
          (total, album) => total + album.songs.length,
          0
        )
      };
    })
    .filter(
      (
        group
      ): group is {
        section: ReleaseSection;
        albums: Album<SongSummary>[];
        count: number;
      } => group !== null
    );
}

export function SongLibrary({ songs }: SongLibraryProps) {
  const [material, setMaterial] = useState<MaterialFilter>("all");
  const [query, setQuery] = useState("");
  const [stemType, setStemType] = useState<"all" | StemType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("expanded");

  const filteredSongs = useMemo(
    () => filterSongs(songs, material, query, stemType),
    [material, query, songs, stemType]
  );
  const albums = useMemo(() => getAlbums(filteredSongs), [filteredSongs]);
  const groupedAlbums = useMemo(() => groupAlbumsBySection(albums), [albums]);

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a song or album"
              className="mt-2 w-full rounded border border-white/10 bg-ink px-3 py-3 text-white outline-none placeholder:text-stone-500 focus:border-amberline"
            />
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Material
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {materialFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setMaterial(filter.value)}
                  className={`rounded border px-3 py-2 text-sm font-semibold ${
                    material === filter.value
                      ? "border-amberline bg-amberline text-ink"
                      : "border-white/10 bg-rail text-stone-200 hover:border-amberline/70"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              View
            </p>
            <div className="mt-2 grid grid-cols-2 rounded border border-white/10 bg-rail p-1">
              {(["expanded", "condensed"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded px-3 py-2 text-sm font-semibold capitalize ${
                    viewMode === mode
                      ? "bg-amberline text-ink"
                      : "text-stone-300 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-stone-400">
          {filteredSongs.length} of {songs.length} songs across {albums.length}{" "}
          album{albums.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groupedAlbums.map((section) => (
          <section key={section.section} className="flex flex-col gap-4">
            <div className="flex items-end justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
                  {sectionLabels[section.section]}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {section.albums.length} album
                  {section.albums.length === 1 ? "" : "s"}
                </h2>
              </div>
              <span className="text-sm text-stone-500">
                {section.count} song{section.count === 1 ? "" : "s"}
              </span>
            </div>

            {viewMode === "expanded" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {section.albums.map((album) => (
                  <section
                    key={album.id}
                    className="overflow-hidden rounded-lg border border-white/10 bg-panel"
                  >
                    <Link
                      href={`/albums/${album.id}`}
                      className="grid gap-4 border-b border-white/10 p-4 hover:bg-white/[0.03] sm:grid-cols-[88px_1fr_auto] sm:items-center"
                    >
                      <div className="aspect-square w-[88px] overflow-hidden rounded bg-black">
                        <AlbumArtwork
                          artwork={album.artwork}
                          title={album.title}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
                          {sectionLabels[album.section]}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-white">
                          {album.title}
                        </h3>
                      </div>
                      <span className="text-sm font-semibold text-stone-400">
                        Open album
                      </span>
                    </Link>

                    <div className="divide-y divide-white/10">
                      {album.songs.map((song, index) => (
                        <Link
                          key={song.id}
                          href={`/songs/${song.id}`}
                          className="grid gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03] sm:grid-cols-[44px_1fr_auto] sm:items-center"
                        >
                          <span className="font-mono text-xs text-stone-500">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-stone-100">
                            {song.title}
                          </span>
                          <span className="flex flex-wrap gap-2 text-stone-500 sm:justify-end">
                            {song.hasReferenceAudio ? (
                              <span>Reference</span>
                            ) : null}
                            {song.hasChordSheet ? <span>Sheet</span> : null}
                            {song.hasLyrics ? <span>Lyrics</span> : null}
                            {song.stemCount > 0 ? (
                              <span>{song.stemCount} stems</span>
                            ) : null}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
