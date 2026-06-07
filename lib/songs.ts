import songs from "@/public/song-library/songs.json";
import type { Song } from "./types";

const songLibrary = songs as Song[];

export function getSongs(): Song[] {
  return songLibrary;
}

export function getSongById(id: string): Song | undefined {
  return songLibrary.find((song) => song.id === id);
}
