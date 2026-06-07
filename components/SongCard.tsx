import Link from "next/link";
import type { Song } from "@/lib/types";

type SongCardProps = {
  song: Song;
};

export function SongCard({ song }: SongCardProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="group block rounded-lg border border-white/10 bg-panel p-5 shadow-xl shadow-black/20 transition hover:border-amberline/70 hover:bg-[#202229]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{song.title}</h2>
          {song.artist ? (
            <p className="mt-1 text-sm text-stone-300">{song.artist}</p>
          ) : null}
        </div>
        <span className="rounded border border-amberline/40 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amberline">
          {song.stems.length} stems
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-stone-300 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase text-stone-500">BPM</dt>
          <dd className="mt-1 text-stone-100">{song.bpm ?? "TBD"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-stone-500">Key</dt>
          <dd className="mt-1 text-stone-100">{song.key ?? "TBD"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-stone-500">Open</dt>
          <dd className="mt-1 text-stone-100 group-hover:text-amberline">
            Mixer
          </dd>
        </div>
      </dl>
    </Link>
  );
}
