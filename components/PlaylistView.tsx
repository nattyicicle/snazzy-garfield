import Link from "next/link";
import type { Playlist, PlaylistTrack, SongSummary } from "@/lib/types";

type PlaylistViewProps = {
  playlist: Playlist;
  songs: SongSummary[];
};

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

export function PlaylistView({ playlist, songs }: PlaylistViewProps) {
  const songsById = new Map(songs.map((song) => [song.id, song]));
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
                    <span className="font-semibold text-stone-100">
                      {song?.title ?? track.title}
                    </span>
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
