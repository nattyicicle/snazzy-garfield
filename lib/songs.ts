import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Song, SongSummary } from "./types";

const songLibraryPath = path.join(
  process.cwd(),
  "public",
  "song-library",
  "songs.json"
);

let songLibrary: Song[] | null = null;

function loadSongLibrary(): Song[] {
  if (!songLibrary) {
    songLibrary = JSON.parse(readFileSync(songLibraryPath, "utf8")) as Song[];
  }

  return songLibrary;
}

export function getSongs(): Song[] {
  return loadSongLibrary();
}

export function getSongSummaries(): SongSummary[] {
  return loadSongLibrary().map(({ lyrics, chordPro, stems, ...song }) => {
    const referenceAudio = song.referenceAudio ?? song.master;

    return {
      ...song,
      hasChordSheet: Boolean(chordPro?.trim()),
      hasLyrics: lyrics?.some((section) => section.lines.length > 0) ?? false,
      hasReferenceAudio: Boolean(referenceAudio),
      stemCount: stems.length,
      stemTypes: [...new Set(stems.map((stem) => stem.type))]
    };
  });
}

export function getSongById(id: string): Song | undefined {
  return loadSongLibrary().find((song) => song.id === id);
}
