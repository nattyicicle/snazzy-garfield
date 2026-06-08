import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "public/song-library/songs.json");
const wavBackupPath = path.join(
  projectRoot,
  "public/song-library/songs.wav.json"
);
const practiceOutputRoot = path.resolve(
  process.argv[2] ??
    "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield/R2 Upload Practice/song-library-practice"
);

function practiceFileFor(file) {
  return file
    .replace(/^\/song-library\//, "/song-library-practice/")
    .replace(/\.[^/.]+$/, ".m4a");
}

function localPracticePathFor(file) {
  const url = new URL(file, "https://local.invalid");
  const decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const relativePracticePath = decodedPath.replace(
    /^song-library-practice\//,
    ""
  );

  return path.join(practiceOutputRoot, relativePracticePath);
}

async function exists(file) {
  try {
    const fileStat = await stat(file);
    return fileStat.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  const raw = await readFile(manifestPath, "utf8");
  const songs = JSON.parse(raw);
  let practiceCount = 0;
  let wavFallbackCount = 0;

  try {
    await copyFile(manifestPath, wavBackupPath, 0);
  } catch {
    // Existing backups are fine; this script is intentionally repeatable.
  }

  const practiceSongs = await Promise.all(
    songs.map(async (song) => ({
      ...song,
      stems: await Promise.all(
        song.stems.map(async (stem) => {
          const practiceFile = practiceFileFor(stem.file);

          if (await exists(localPracticePathFor(practiceFile))) {
            practiceCount += 1;
            return {
              ...stem,
              file: practiceFile
            };
          }

          wavFallbackCount += 1;
          return stem;
        })
      )
    }))
  );

  await writeFile(manifestPath, `${JSON.stringify(practiceSongs, null, 2)}\n`);
  console.log(`Updated ${manifestPath}`);
  console.log(`WAV backup: ${wavBackupPath}`);
  console.log(`Practice M4A stems: ${practiceCount}`);
  console.log(`WAV fallback stems: ${wavFallbackCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
