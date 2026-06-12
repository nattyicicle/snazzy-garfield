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
import type { Playlist, PlaylistTrack, SongSummary, StemType } from "@/lib/types";

type SongLibraryProps = {
  initialTab?: LibraryTab;
  playlists: Playlist[];
  showTabs?: boolean;
  songs: SongSummary[];
};

type LibraryTab = "library" | "playlist";
type ViewMode = "expanded" | "condensed";

const stemFilters: Array<{ label: string; value: "all" | StemType }> = [
  { label: "All", value: "all" },
  { label: "Vocals", value: "vocals" },
  { label: "Guitar", value: "guitar" },
  { label: "Drums", value: "drums" },
  { label: "Bass", value: "bass" },
  { label: "Keys", value: "keys" }
];

function filterSongs(
  songs: SongSummary[],
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

    return matchesQuery && matchesStem;
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

function groupPlaylistTracks(tracks: PlaylistTrack[]) {
  const groups = new Map<string, PlaylistTrack[]>();

  for (const track of tracks) {
    const side = track.side || "Set";
    groups.set(side, [...(groups.get(side) ?? []), track]);
  }

  return [...groups.entries()].map(([side, sideTracks]) => ({
    side,
    tracks: sideTracks.sort((a, b) => a.position - b.position)
  }));
}

function PlaylistView({
  playlist,
  songsById
}: {
  playlist: Playlist;
  songsById: Map<string, SongSummary>;
}) {
  const groupedTracks = groupPlaylistTracks(playlist.tracks);
  const linkedTracks = playlist.tracks.filter((track) =>
    track.songId ? songsById.has(track.songId) : false
  );
  const stemBackedTracks = linkedTracks.filter((track) => {
    const song = track.songId ? songsById.get(track.songId) : null;
    return (song?.stemCount ?? 0) > 0;
  });
  const firstLinkedSong = linkedTracks[0]?.songId
    ? songsById.get(linkedTracks[0].songId)
    : null;

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
              Playlist
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {playlist.title}
            </h2>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-stone-500">Tracks</dt>
                <dd className="mt-1 font-semibold text-stone-100">
                  {playlist.tracks.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Linked</dt>
                <dd className="mt-1 font-semibold text-stone-100">
                  {linkedTracks.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Mixers</dt>
                <dd className="mt-1 font-semibold text-stone-100">
                  {stemBackedTracks.length}
                </dd>
              </div>
            </dl>
          </div>
          {firstLinkedSong ? (
            <Link
              href={`/songs/${firstLinkedSong.id}`}
              className="w-fit rounded border border-amberline/50 bg-amberline px-4 py-3 text-sm font-semibold text-ink hover:bg-[#ffd37a]"
            >
              Open first song
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groupedTracks.map((group) => (
          <section
            key={group.side}
            className="overflow-hidden rounded-lg border border-white/10 bg-panel"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">
                Setlist {group.side}
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              {group.tracks.map((track) => {
                const song = track.songId ? songsById.get(track.songId) : null;
                const trackLabel = String(track.position).padStart(2, "0");

                return (
                  <Link
                    key={`${group.side}-${track.position}-${track.title}`}
                    href={song ? `/songs/${song.id}` : track.driveUrl ?? "#"}
                    className="grid gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03] sm:grid-cols-[52px_1fr_auto] sm:items-center"
                  >
                    <span className="font-mono text-xs text-stone-500">
                      {trackLabel}
                    </span>
                    <div>
                      {song ? (
                        <span className="font-semibold text-stone-100">
                          {song.title}
                        </span>
                      ) : (
                        <span className="font-semibold text-stone-100">
                          {track.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {song ? (
                        <span className="rounded border border-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                          {song.stemCount > 0 ? "Mixer" : "Reference"}
                        </span>
                      ) : null}
                      <span className="text-xs font-semibold uppercase tracking-wide text-amberline">
                        Open
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function SongLibrary({
  initialTab = "playlist",
  playlists,
  showTabs = true,
  songs
}: SongLibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [stemType, setStemType] = useState<"all" | StemType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("expanded");

  const filteredSongs = useMemo(
    () => filterSongs(songs, query, stemType),
    [query, songs, stemType]
  );
  const albums = useMemo(() => getAlbums(filteredSongs), [filteredSongs]);
  const groupedAlbums = useMemo(() => groupAlbumsBySection(albums), [albums]);
  const songsById = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs]
  );
  const defaultPlaylist = playlists[0];

  return (
    <section className="flex flex-col gap-5">
      {showTabs ? (
        <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-rail p-1">
          {(["playlist", "library"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded px-4 py-3 text-sm font-semibold capitalize ${
                activeTab === tab
                  ? "bg-amberline text-ink"
                  : "text-stone-300 hover:text-white"
              }`}
            >
              {tab === "playlist" ? "Playlist" : "Song library"}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === "playlist" && defaultPlaylist ? (
        <PlaylistView playlist={defaultPlaylist} songsById={songsById} />
      ) : (
        <>
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
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
                          <span className="text-stone-500">
                            {song.stemCount > 0
                              ? `${song.stemCount} stems`
                              : "Reference"}
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
        </>
      )}
    </section>
  );
}
