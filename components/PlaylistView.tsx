import {
  PlaylistPlayer,
  type PlaylistPlayerTrack
} from "@/components/PlaylistPlayer";
import type { Playlist, SongSummary } from "@/lib/types";

type PlaylistViewProps = {
  playlist: Playlist;
  songs: SongSummary[];
};

export function PlaylistView({ playlist, songs }: PlaylistViewProps) {
  const songsById = new Map(songs.map((song) => [song.id, song]));
  const linkedTracks = playlist.tracks.filter((track) =>
    track.songId ? songsById.has(track.songId) : false
  );
  const stemBackedTracks = linkedTracks.filter((track) => {
    const song = track.songId ? songsById.get(track.songId) : null;
    return (song?.stemCount ?? 0) > 0;
  });
  const playerTracks: PlaylistPlayerTrack[] = playlist.tracks.map((track) => {
    const song = track.songId ? songsById.get(track.songId) : null;

    return {
      id: `${track.side ?? "Set"}-${track.position}-${track.songId ?? track.title}`,
      title: song?.title ?? track.title,
      href: song ? `/songs/${song.id}` : track.driveUrl ?? "#",
      side: track.side || "Set",
      position: track.position,
      source: song?.referenceAudio ?? song?.master ?? null,
      hasChordSheet: song?.hasChordSheet ?? false,
      hasLyrics: song?.hasLyrics ?? false,
      hasMixer: (song?.stemCount ?? 0) > 0
    };
  });

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-white/10 bg-panel p-4">
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

      <PlaylistPlayer tracks={playerTracks} />
    </section>
  );
}
