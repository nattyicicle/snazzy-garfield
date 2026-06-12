import { LibraryTabs } from "@/components/LibraryTabs";
import { SongLibrary } from "@/components/SongLibrary";
import { getPlaylists } from "@/lib/playlists";
import { getSongSummaries } from "@/lib/songs";

export default function SongLibraryPage() {
  const songs = getSongSummaries();
  const playlists = getPlaylists();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amberline">
          Practice Player
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Song library
        </h1>
      </header>
      <section className="flex flex-col gap-5">
        <LibraryTabs active="library" />
        <SongLibrary
          initialTab="library"
          playlists={playlists}
          showTabs={false}
          songs={songs}
        />
      </section>
    </main>
  );
}
