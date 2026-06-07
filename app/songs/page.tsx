import { SongLibrary } from "@/components/SongLibrary";
import { getSongs } from "@/lib/songs";

export default function SongsPage() {
  const songs = getSongs();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-8 border-b border-white/10 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amberline">
          Practice Player
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Song Library
        </h1>
      </header>
      <SongLibrary songs={songs} />
    </main>
  );
}
