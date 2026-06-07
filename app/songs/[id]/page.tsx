import Link from "next/link";
import { notFound } from "next/navigation";
import { StemPlayer } from "@/components/StemPlayer";
import { getSongPlacement } from "@/lib/albums";
import { getSongById, getSongs } from "@/lib/songs";

type SongPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return getSongs().map((song) => ({
    id: song.id
  }));
}

export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;
  const song = getSongById(id);

  if (!song) {
    notFound();
  }

  const placement = getSongPlacement(song);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8">
      <Link
        href={`/albums/${placement.albumId}`}
        className="mb-6 w-fit text-sm font-semibold text-stone-300 hover:text-amberline"
      >
        Back to {placement.title}
      </Link>
      <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amberline">
            Practice Player
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {song.title}
          </h1>
          {song.artist ? (
            <p className="mt-2 text-stone-300">{song.artist}</p>
          ) : null}
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded border border-white/10 bg-panel px-4 py-3">
            <dt className="text-xs uppercase text-stone-500">BPM</dt>
            <dd className="mt-1 text-white">{song.bpm ?? "TBD"}</dd>
          </div>
          <div className="rounded border border-white/10 bg-panel px-4 py-3">
            <dt className="text-xs uppercase text-stone-500">Key</dt>
            <dd className="mt-1 text-white">{song.key ?? "TBD"}</dd>
          </div>
          <div className="rounded border border-white/10 bg-panel px-4 py-3">
            <dt className="text-xs uppercase text-stone-500">Stems</dt>
            <dd className="mt-1 text-white">{song.stems.length}</dd>
          </div>
        </dl>
      </header>
      <StemPlayer song={song} />
    </main>
  );
}
