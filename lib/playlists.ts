import playlists from "@/public/song-library/playlists.json";
import type { Playlist } from "./types";

const playlistLibrary = playlists as Playlist[];

export function getPlaylists(): Playlist[] {
  return playlistLibrary;
}

export function getDefaultPlaylist(): Playlist {
  return playlistLibrary[0];
}
