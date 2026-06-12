import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const setlistSourceDir =
  process.argv[2] ??
  "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield/– SETLIST IDEA";
const outputDir = "public/song-library-references/setlist-idea";
const songsPath = "public/song-library/songs.json";
const playlistsPath = "public/song-library/playlists.json";

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFilename(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mp3PathForTrack(track) {
  return `/song-library-references/setlist-idea/${track.side.toLowerCase()}-${String(
    track.position
  ).padStart(2, "0")}-${slugify(track.title)}.mp3`;
}

mkdirSync(outputDir, { recursive: true });

const sourceFiles = new Map(
  readdirSync(setlistSourceDir)
    .filter((file) => file.toLowerCase().endsWith(".wav"))
    .map((file) => [normalizeFilename(file), file])
);

const playlists = JSON.parse(readFileSync(playlistsPath, "utf8"));
const songs = JSON.parse(readFileSync(songsPath, "utf8"));
const songsById = new Map(songs.map((song) => [song.id, song]));
const converted = [];
const missing = [];

for (const playlist of playlists) {
  for (const track of playlist.tracks ?? []) {
    const sourceName = sourceFiles.get(normalizeFilename(track.sourceFile));

    if (!sourceName) {
      missing.push(track.sourceFile);
      continue;
    }

    const sourcePath = path.join(setlistSourceDir, sourceName);
    const publicPath = mp3PathForTrack(track);
    const targetPath = path.join("public", publicPath.replace(/^\//, ""));
    const shouldConvert =
      !statExists(targetPath) ||
      statSync(sourcePath).mtimeMs > statSync(targetPath).mtimeMs;

    if (shouldConvert) {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          sourcePath,
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "192k",
          targetPath
        ],
        { stdio: "inherit" }
      );
    }

    track.sourceFile = path.basename(publicPath);
    track.referenceAudio = publicPath;

    const song = songsById.get(track.songId);
    if (song) {
      song.referenceAudio = publicPath;
      song.master = publicPath;
    }

    converted.push(publicPath);
  }
}

writeFileSync(playlistsPath, `${JSON.stringify(playlists, null, 2)}\n`);
writeFileSync(songsPath, `${JSON.stringify(songs, null, 2)}\n`);

console.log(`Updated ${converted.length} setlist references.`);
if (missing.length > 0) {
  console.warn(`Missing ${missing.length} source file(s):`);
  for (const file of missing) {
    console.warn(`- ${file}`);
  }
}

function statExists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}
