import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePublicDir = path.join(projectRoot, "public");
const libraryFile = path.join(sourcePublicDir, "song-library", "songs.json");
const defaultDestination = path.join(
  "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield",
  "R2 Upload Clean",
  "song-library",
  "songs"
);
const destinationRoot = path.resolve(process.argv[2] ?? defaultDestination);
const concurrency = Number(process.env.COPY_CONCURRENCY ?? 8);

function sourcePathForPublicUrl(file) {
  const url = new URL(file, "https://local.invalid");
  const decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const sourcePath = path.resolve(sourcePublicDir, decodedPath);

  if (!sourcePath.startsWith(sourcePublicDir + path.sep)) {
    throw new Error(`Refusing to copy path outside public/: ${file}`);
  }

  return { sourcePath, relativePublicPath: decodedPath };
}

async function hasSameSize(source, destination) {
  try {
    const [sourceStat, destinationStat] = await Promise.all([
      stat(source),
      stat(destination)
    ]);

    return sourceStat.size === destinationStat.size;
  } catch {
    return false;
  }
}

async function main() {
  const songs = JSON.parse(await readFile(libraryFile, "utf8"));
  const stems = songs.flatMap((song) =>
    song.stems.map((stem) => ({
      song,
      stem
    }))
  );
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  async function copyStem({ song, stem }) {
    try {
      const { sourcePath, relativePublicPath } = sourcePathForPublicUrl(
        stem.file
      );
      const relativeStemPath = relativePublicPath.replace(
        /^song-library\/songs\//,
        ""
      );
      const destinationPath = path.join(destinationRoot, relativeStemPath);

      if (await hasSameSize(sourcePath, destinationPath)) {
        skipped += 1;
        return;
      }

      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
      copied += 1;
    } catch (error) {
      failed += 1;
      console.warn(
        `Failed: ${song.id} / ${stem.name} (${stem.file}) - ${
          error.code ?? error.message
        }`
      );
    } finally {
      completed += 1;

      if (completed % 50 === 0 || completed === stems.length) {
        console.log(
          `Progress: ${completed}/${stems.length} (copied ${copied}, skipped ${skipped}, failed ${failed})`
        );
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, stems.length)) },
    async (_, workerIndex) => {
      for (let index = workerIndex; index < stems.length; index += concurrency) {
        await copyStem(stems[index]);
      }
    }
  );

  await Promise.all(workers);

  console.log(`Destination: ${destinationRoot}`);
  console.log(`Copied: ${copied}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
