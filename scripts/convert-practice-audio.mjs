import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const sourceRoot = path.resolve(
  process.argv[2] ??
    "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield/R2 Upload Clean/song-library"
);
const outputRoot = path.resolve(
  process.argv[3] ??
    "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield/R2 Upload Practice/song-library-practice"
);
const manifestPath = path.join(projectRoot, "public/song-library/songs.json");
const concurrency = Number(process.env.CONVERT_CONCURRENCY ?? 2);
const bitrate = String(process.env.PRACTICE_AUDIO_BITRATE ?? 192000);

function sourcePathForFile(file) {
  const url = new URL(file, "https://local.invalid");
  const decodedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const relativePath = decodedPath.replace(/^song-library\//, "");

  return {
    sourcePath: path.join(sourceRoot, relativePath),
    outputPath: path
      .join(outputRoot, relativePath)
      .replace(/\.[^.]+$/, ".m4a")
  };
}

async function hasOutput(outputPath) {
  try {
    const outputStat = await stat(outputPath);
    return outputStat.size > 0;
  } catch {
    return false;
  }
}

function convertFile(sourcePath, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("afconvert", [
      "-f",
      "m4af",
      "-d",
      "aac",
      "-b",
      bitrate,
      sourcePath,
      outputPath
    ]);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `afconvert exited ${code} for ${sourcePath}${
            stderr ? `\n${stderr}` : ""
          }`
        )
      );
    });
  });
}

async function main() {
  const songs = JSON.parse(await readFile(manifestPath, "utf8"));
  const stems = songs.flatMap((song) =>
    song.stems.map((stem) => ({
      song,
      stem,
      ...sourcePathForFile(stem.file)
    }))
  );
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  async function convertStem(item) {
    try {
      if (await hasOutput(item.outputPath)) {
        skipped += 1;
        return;
      }

      await stat(item.sourcePath);
      await mkdir(path.dirname(item.outputPath), { recursive: true });
      await convertFile(item.sourcePath, item.outputPath);
      converted += 1;
    } catch (error) {
      failed += 1;
      console.warn(
        `Failed: ${item.song.id} / ${item.stem.name} (${item.stem.file}) - ${
          error.code ?? error.message
        }`
      );
    } finally {
      completed += 1;

      if (completed % 25 === 0 || completed === stems.length) {
        console.log(
          `Progress: ${completed}/${stems.length} (converted ${converted}, skipped ${skipped}, failed ${failed})`
        );
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, stems.length)) },
    async (_, workerIndex) => {
      for (let index = workerIndex; index < stems.length; index += concurrency) {
        await convertStem(stems[index]);
      }
    }
  );

  await Promise.all(workers);

  console.log(`Source: ${sourceRoot}`);
  console.log(`Output: ${outputRoot}`);
  console.log(`Converted: ${converted}`);
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
