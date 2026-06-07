import { copyFile, mkdir, readlink, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DRIVE_ROOT =
  "/Users/snazzygarfield/Library/CloudStorage/GoogleDrive-nfkoziol@gmail.com/My Drive/— Snazzy Garfield/unreleased/— 2026 Snazzy Re-Records";
const SOURCE_DIR =
  path.join(DRIVE_ROOT, "Stem Downloads");
const specialSongSources = [
  {
    title: "1 or 2",
    sourceDir: path.join(DRIVE_ROOT, "1 or 2", "1 or 2", "Audio Files"),
    priority: 4
  }
];
const TARGET_DIR = path.resolve("public/song-library/songs");
const LIBRARY_FILE = path.resolve("public/song-library/songs.json");
const FAILURES_FILE = path.resolve("public/song-library/import-failures.json");

const audioExtensions = new Set([".wav", ".mp3", ".m4a", ".aiff", ".aif", ".flac"]);
const collectionFolderNames = new Set(["Album WIPs", "Bounces", "Mastered"]);
const genericChildFolderNames = new Set(["Audio Files", "Stems"]);
const ignoredFallbackFolderNames = new Set(["Bounces", "Mastered"]);
const shouldScanOnly = process.argv.includes("--scan-existing");
const shouldLinkDrive = process.argv.includes("--link-drive");
const shouldLinkAllDrive = process.argv.includes("--link-all-drive");

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanStemName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/^\d+\s*/, "")
    .trim();
}

function cleanSongTitle(dirName) {
  const withoutStemSuffix = dirName
    .replace(/\s+Stems\s*(\([^)]*\))?(?:\s+\d+)?$/i, (_, parenthetical = "") => {
      return parenthetical ? ` ${parenthetical}` : "";
    })
    .replace(/\s+/g, " ")
    .trim();

  if (withoutStemSuffix && withoutStemSuffix !== dirName) {
    return cleanSongTitle(withoutStemSuffix);
  }

  if (!/^1\s+or\s+2$/i.test(dirName) && /\s+2$/.test(dirName)) {
    return dirName.replace(/\s+2$/, "").trim();
  }

  return dirName.replace(/\s+/g, " ").trim();
}

function titleForChildFolder(parentName, childName) {
  if (isAudioContainerFolder(childName)) {
    const parentTitle = cleanSongTitle(parentName);
    const childTitle = cleanSongTitle(childName);

    if (
      childName === "Stems" ||
      /^\d{6,8}$/.test(childName) ||
      slugify(childTitle) === slugify(parentTitle)
    ) {
      return parentTitle;
    }

    return childTitle;
  }

  return cleanSongTitle(childName);
}

function isAudioContainerFolder(folderName) {
  return (
    folderName === "Stems" ||
    /^\d{6,8}$/.test(folderName) ||
    /\bStems(?:\s*\([^)]*\))?(?:\s+\d+)?$/i.test(folderName)
  );
}

function minimumAudioFilesForContainer(folderName) {
  return folderName === "Stems" || /\bStems(?:\s*\([^)]*\))?(?:\s+\d+)?$/i.test(folderName)
    ? 1
    : 4;
}

function isSpecialAudioFilesFolder(rootName, folderName) {
  return /^1\s+or\s+2$/i.test(rootName) && folderName === "Audio Files";
}

function fallbackTitleForAudioDir(relativeDir) {
  const parts = relativeDir.split(path.sep).filter(Boolean);
  const meaningfulParts = parts.filter((part) => {
    return (
      part !== "Audio Files" &&
      part !== "Media" &&
      !part.toLowerCase().endsWith(".logicx")
    );
  });

  return cleanSongTitle(meaningfulParts.at(-1) ?? parts.at(-1) ?? relativeDir);
}

function shouldUseFallbackAudioDir(relativeDir, audioFileCount) {
  const parts = relativeDir.split(path.sep).filter(Boolean);
  const folderName = parts.at(-1) ?? "";

  if (audioFileCount < 4 || audioFileCount > 20) {
    return false;
  }

  if (parts.length <= 1) {
    return false;
  }

  if (collectionFolderNames.has(folderName) || ignoredFallbackFolderNames.has(folderName)) {
    return false;
  }

  if (parts.some((part) => part.toLowerCase().endsWith(".logicx"))) {
    return false;
  }

  return true;
}

function stemTypeFromName(name) {
  const lower = name.toLowerCase();

  if (lower.includes("vocal")) return "vocals";
  if (lower.includes("drum")) return "drums";
  if (lower.includes("bass")) return "bass";
  if (lower.includes("guitar")) return "guitar";
  if (lower.includes("keyboard") || lower.includes("piano") || lower.includes("keys")) return "keys";
  if (lower.includes("synth")) return "synth";
  if (lower.includes("percussion")) return "percussion";
  if (lower.includes("brass")) return "brass";

  return "other";
}

function uniqueId(base, usedIds) {
  let id = base || "stem";
  let candidate = id;
  let index = 2;

  while (usedIds.has(candidate)) {
    candidate = `${id}-${index}`;
    index += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

async function fileExistsWithSameSize(source, target) {
  try {
    const [sourceStat, targetStat] = await Promise.all([stat(source), stat(target)]);
    return sourceStat.size === targetStat.size;
  } catch {
    return false;
  }
}

async function copyWithRetry(source, target, attempts = 5) {
  if (await fileExistsWithSameSize(source, target)) {
    return "skipped";
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await copyFile(source, target);
      return "copied";
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      const waitMs = attempt * 3000;
      console.warn(
        `Retrying ${path.basename(source)} after ${error.code ?? "copy error"} (${attempt}/${attempts})...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return "failed";
}

async function main() {
  if (shouldLinkAllDrive) {
    await linkAllDriveLibrary();
    return;
  }

  if (shouldLinkDrive) {
    await linkDriveLibrary();
    return;
  }

  if (shouldScanOnly) {
    await scanExistingLibrary();
    return;
  }

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const songDirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  await mkdir(TARGET_DIR, { recursive: true });

  const songs = [];
  const failures = [];

  for (const songDir of songDirs) {
    const sourceSongDir = path.join(SOURCE_DIR, songDir.name);
    const files = await readdir(sourceSongDir, { withFileTypes: true });
    const audioFiles = files
      .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (audioFiles.length === 0) {
      continue;
    }

    const songId = slugify(songDir.name);
    const targetSongDir = path.join(TARGET_DIR, songId);
    await mkdir(targetSongDir, { recursive: true });

    const usedStemIds = new Set();
    const stems = [];

    for (const audioFile of audioFiles) {
      const stemName = cleanStemName(audioFile.name);
      const stemType = stemTypeFromName(stemName);
      const stemId = uniqueId(slugify(stemName), usedStemIds);
      const extension = path.extname(audioFile.name).toLowerCase();
      const targetFileName = `${stemId}${extension}`;

      const sourceFile = path.join(sourceSongDir, audioFile.name);
      const targetFile = path.join(targetSongDir, targetFileName);

      try {
        await copyWithRetry(sourceFile, targetFile);
      } catch (error) {
        failures.push({
          song: songDir.name,
          source: sourceFile,
          target: targetFile,
          error: error.code ?? error.message ?? "copy failed"
        });
        console.warn(`Skipping ${songDir.name} / ${audioFile.name}: ${error.code ?? error.message}`);
        continue;
      }

      stems.push({
        id: stemId,
        name: stemName,
        type: stemType,
        file: `/song-library/songs/${songId}/${targetFileName}`
      });
    }

    if (stems.length > 0) {
      songs.push({
        id: songId,
        title: songDir.name,
        artist: "Snazzy Garfield",
        bpm: null,
        key: null,
        master: null,
        stems
      });
    }
  }

  await writeFile(LIBRARY_FILE, `${JSON.stringify(songs, null, 2)}\n`);
  await writeFile(FAILURES_FILE, `${JSON.stringify(failures, null, 2)}\n`);
  console.log(`Imported ${songs.length} songs and ${songs.reduce((total, song) => total + song.stems.length, 0)} stems.`);
  console.log(`Failed stems: ${failures.length}`);
}

function publicAudioPath(songDirName, fileName) {
  return `/song-library/songs/${encodeURIComponent(songDirName)}/${encodeURIComponent(fileName)}`;
}

async function collectSongsFromSource() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const songDirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const songs = [];

  for (const songDir of songDirs) {
    const sourceSongDir = path.join(SOURCE_DIR, songDir.name);
    const files = await readdir(sourceSongDir, { withFileTypes: true });
    const audioFiles = files
      .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (audioFiles.length === 0) {
      continue;
    }

    const usedStemIds = new Set();
    const stems = audioFiles.map((audioFile) => {
      const stemName = cleanStemName(audioFile.name);
      const stemId = uniqueId(slugify(stemName), usedStemIds);

      return {
        id: stemId,
        name: stemName,
        type: stemTypeFromName(stemName),
        file: publicAudioPath(songDir.name, audioFile.name)
      };
    });

    songs.push({
      id: slugify(songDir.name),
      title: songDir.name,
      artist: "Snazzy Garfield",
      bpm: null,
      key: null,
      master: null,
      stems
    });
  }

  return songs;
}

async function linkDriveLibrary() {
  await mkdir(path.dirname(TARGET_DIR), { recursive: true });

  try {
    await symlink(SOURCE_DIR, TARGET_DIR, "dir");
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }

  const songs = await collectSongsFromSource();
  await writeFile(LIBRARY_FILE, `${JSON.stringify(songs, null, 2)}\n`);
  await writeFile(FAILURES_FILE, "[]\n");
  console.log(`Linked ${songs.length} songs and ${songs.reduce((total, song) => total + song.stems.length, 0)} stems.`);
}

async function safeResetTargetDir() {
  try {
    await rm(TARGET_DIR, { recursive: true, force: true });
  } catch (error) {
    try {
      await readlink(TARGET_DIR);
      await rm(TARGET_DIR, { force: true });
    } catch {
      throw error;
    }
  }

  await mkdir(TARGET_DIR, { recursive: true });
}

async function audioFilesInDir(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function collectAudioCandidates() {
  const candidates = [];

  for (const source of specialSongSources) {
    await addCandidateFromDir(source.sourceDir, source.title, source.priority);
  }

  const rootEntries = await readdir(DRIVE_ROOT, { withFileTypes: true });

  async function addCandidateFromDir(dir, title, priority, options = {}) {
    const { minimumAudioFiles = 1 } = options;
    const audioFiles = await audioFilesInDir(dir);

    if (audioFiles.length < minimumAudioFiles) {
      return;
    }

    candidates.push({
      title,
      sourceDir: dir,
      audioFiles,
      priority
    });
  }

  for (const rootEntry of rootEntries) {
    if (!rootEntry.isDirectory()) {
      continue;
    }

    const rootPath = path.join(DRIVE_ROOT, rootEntry.name);
    const isStemDownloads = rootEntry.name === "Stem Downloads";
    const priority = isStemDownloads ? 3 : 1;

    if (!collectionFolderNames.has(rootEntry.name)) {
      await addCandidateFromDir(rootPath, cleanSongTitle(rootEntry.name), priority, {
        minimumAudioFiles: 4
      });
    }

    const childEntries = await readdir(rootPath, { withFileTypes: true });
    for (const childEntry of childEntries) {
      if (!childEntry.isDirectory()) {
        continue;
      }

      const childPath = path.join(rootPath, childEntry.name);
      const childTitle = titleForChildFolder(rootEntry.name, childEntry.name);
      const childPriority = isStemDownloads ? 3 : priority + 1;

      if (isStemDownloads || isAudioContainerFolder(childEntry.name)) {
        await addCandidateFromDir(childPath, childTitle, childPriority, {
          minimumAudioFiles: isStemDownloads ? 1 : minimumAudioFilesForContainer(childEntry.name)
        });
      }

      const grandchildEntries = await readdir(childPath, { withFileTypes: true });
      for (const grandchildEntry of grandchildEntries) {
        if (!grandchildEntry.isDirectory()) {
          continue;
        }

        const grandchildPath = path.join(childPath, grandchildEntry.name);
        const grandchildTitle = titleForChildFolder(childTitle, grandchildEntry.name);
        if (
          isAudioContainerFolder(grandchildEntry.name) ||
          isSpecialAudioFilesFolder(rootEntry.name, grandchildEntry.name)
        ) {
          await addCandidateFromDir(grandchildPath, grandchildTitle, childPriority + 1, {
            minimumAudioFiles: minimumAudioFilesForContainer(grandchildEntry.name)
          });
        }
      }
    }
  }

  async function collectFallbackCandidates(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const relativeDir = path.relative(DRIVE_ROOT, dir);
    const audioFiles = entries
      .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()));

    if (shouldUseFallbackAudioDir(relativeDir, audioFiles.length)) {
      await addCandidateFromDir(dir, fallbackTitleForAudioDir(relativeDir), 1.5);
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      await collectFallbackCandidates(path.join(dir, entry.name));
    }
  }

  await collectFallbackCandidates(DRIVE_ROOT);

  return candidates;
}

function chooseCandidates(candidates) {
  const bySourceDir = new Map();

  for (const candidate of candidates) {
    const existingSource = bySourceDir.get(candidate.sourceDir);

    if (
      !existingSource ||
      candidate.priority > existingSource.priority ||
      (candidate.priority === existingSource.priority &&
        candidate.title.length < existingSource.title.length)
    ) {
      bySourceDir.set(candidate.sourceDir, candidate);
    }
  }

  const byId = new Map();

  for (const candidate of bySourceDir.values()) {
    const id = slugify(candidate.title);
    const existing = byId.get(id);

    if (
      !existing ||
      candidate.priority > existing.priority ||
      (candidate.priority === existing.priority &&
        candidate.audioFiles.length > existing.audioFiles.length)
    ) {
      byId.set(id, { ...candidate, id });
    }
  }

  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

async function linkAllDriveLibrary() {
  await safeResetTargetDir();
  const candidates = chooseCandidates(await collectAudioCandidates());
  const songs = [];

  for (const candidate of candidates) {
    const targetSongDir = path.join(TARGET_DIR, candidate.id);
    await symlink(candidate.sourceDir, targetSongDir, "dir");

    const usedStemIds = new Set();
    const stems = candidate.audioFiles.map((audioFile) => {
      const stemName = cleanStemName(audioFile.name);
      const stemId = uniqueId(slugify(stemName), usedStemIds);

      return {
        id: stemId,
        name: stemName,
        type: stemTypeFromName(stemName),
        file: `/song-library/songs/${candidate.id}/${encodeURIComponent(audioFile.name)}`
      };
    });

    songs.push({
      id: candidate.id,
      title: candidate.title,
      artist: "Snazzy Garfield",
      bpm: null,
      key: null,
      master: null,
      stems
    });
  }

  await writeFile(LIBRARY_FILE, `${JSON.stringify(songs, null, 2)}\n`);
  await writeFile(FAILURES_FILE, "[]\n");
  console.log(`Linked ${songs.length} songs and ${songs.reduce((total, song) => total + song.stems.length, 0)} stems.`);
}

async function scanExistingLibrary() {
  const entries = await readdir(TARGET_DIR, { withFileTypes: true });
  const songDirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const songs = [];

  for (const songDir of songDirs) {
    const files = await readdir(path.join(TARGET_DIR, songDir.name), {
      withFileTypes: true
    });
    const audioFiles = files
      .filter((entry) => entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (audioFiles.length === 0) {
      continue;
    }

    const stems = audioFiles.map((audioFile) => {
      const stemName = cleanStemName(audioFile.name);

      return {
        id: path.basename(audioFile.name, path.extname(audioFile.name)),
        name: stemName
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        type: stemTypeFromName(stemName),
        file: `/song-library/songs/${songDir.name}/${audioFile.name}`
      };
    });

    songs.push({
      id: songDir.name,
      title: songDir.name
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      artist: "Snazzy Garfield",
      bpm: null,
      key: null,
      master: null,
      stems
    });
  }

  await writeFile(LIBRARY_FILE, `${JSON.stringify(songs, null, 2)}\n`);
  console.log(`Scanned ${songs.length} songs and ${songs.reduce((total, song) => total + song.stems.length, 0)} copied stems.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
