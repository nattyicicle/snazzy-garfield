import Link from "next/link";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { sectionLabels } from "@/lib/albums";
import type { Album, LibrarySong } from "@/lib/albums";

type AlbumCardProps = {
  album: Album<LibrarySong>;
};

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group grid overflow-hidden rounded-lg border border-white/10 bg-panel shadow-xl shadow-black/20 transition hover:border-amberline/70 hover:bg-[#202229]"
    >
      <div className="aspect-square overflow-hidden bg-black">
        <AlbumArtwork artwork={album.artwork} title={album.title} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
              {sectionLabels[album.section]}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {album.title}
            </h3>
          </div>
          <span className="rounded border border-white/10 px-2 py-1 text-xs font-semibold text-stone-300">
            {album.songs.length}
          </span>
        </div>
        <p className="mt-4 text-sm font-semibold text-stone-400 group-hover:text-amberline">
          Open album
        </p>
      </div>
    </Link>
  );
}
