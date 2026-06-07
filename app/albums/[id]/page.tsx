import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { getAlbumById, getAlbums, sectionLabels } from "@/lib/albums";
import { getSongs } from "@/lib/songs";

type AlbumPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return getAlbums(getSongs()).map((album) => ({
    id: album.id
  }));
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const album = getAlbumById(getSongs(), id);

  if (!album) {
    notFound();
  }

  const stemCount = album.songs.reduce(
    (total, song) => total + song.stems.length,
    0
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
      <Link
        href="/songs"
        className="mb-6 w-fit text-sm font-semibold text-stone-300 hover:text-amberline"
      >
        Back to library
      </Link>

      <header className="mb-8 grid gap-6 border-b border-white/10 pb-8 md:grid-cols-[260px_1fr] md:items-end">
        <div className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-black/30">
          <AlbumArtwork artwork={album.artwork} title={album.title} />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amberline">
            {sectionLabels[album.section]}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            {album.title}
          </h1>
          <p className="mt-3 text-stone-300">Snazzy Garfield</p>
          <dl className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded border border-white/10 bg-panel px-4 py-3">
              <dt className="text-xs uppercase text-stone-500">Tracks</dt>
              <dd className="mt-1 text-white">{album.songs.length}</dd>
            </div>
            <div className="rounded border border-white/10 bg-panel px-4 py-3">
              <dt className="text-xs uppercase text-stone-500">Stems</dt>
              <dd className="mt-1 text-white">{stemCount}</dd>
            </div>
            <div className="rounded border border-white/10 bg-panel px-4 py-3">
              <dt className="text-xs uppercase text-stone-500">Status</dt>
              <dd className="mt-1 text-white">
                {sectionLabels[album.section]}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-panel">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Tracks</h2>
        </div>
        <div className="divide-y divide-white/10">
          {album.songs.map((song, index) => (
            <Link
              key={song.id}
              href={`/songs/${song.id}`}
              className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[48px_1fr_auto_auto] sm:items-center"
            >
              <span className="font-mono text-xs text-stone-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-semibold text-stone-100">
                {song.title}
              </span>
              <span className="text-sm text-stone-500">
                {song.stems.length} stems
              </span>
              <span className="text-sm font-semibold text-amberline">
                Open mixer
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
