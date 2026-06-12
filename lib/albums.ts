import type { Song, SongSummary } from "@/lib/types";

export type ReleaseSection = "released" | "unreleased" | "other";

export type LibrarySong = Song | SongSummary;

export type Album<TSong extends LibrarySong = Song> = {
  id: string;
  title: string;
  section: ReleaseSection;
  artwork?: string;
  songs: TSong[];
};

const albumArtwork: Record<string, string> = {
  "afraid-to-leave-my-stoop-ep": "/album-art/afraid-to-leave-my-stoop-ep.png",
  aitistic: "/album-art/aitistic.png",
  "aitistic-unplugged": "/album-art/aitistic-unplugged.png",
  mysterai: "/album-art/mysterai.png",
  "tangerines-and-daffodils": "/album-art/tangerines-and-daffodils.png",
  "the-dog-in-me": "/album-art/the-dog-in-me.png",
  villain: "/album-art/villain.png",
  "whimsical-irreverence": "/album-art/whimsical-irreverence.png",
  "you-and-your-hoes": "/album-art/you-and-your-hoes.png"
};

export const sectionLabels: Record<ReleaseSection, string> = {
  released: "Released",
  unreleased: "Unreleased",
  other: "Other"
};

export const sectionOrder: ReleaseSection[] = [
  "released",
  "unreleased",
  "other"
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function prettifyPathPart(value: string | undefined) {
  if (!value) {
    return "Singles";
  }

  return decodeURIComponent(value)
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getSongPlacement(song: LibrarySong) {
  if (song.album) {
    const section = song.section ?? "released";
    const title = prettifyPathPart(song.album);

    if (section === "released" || section === "unreleased") {
      return {
        albumId: `${section}-${slugify(title)}`,
        albumSlug: slugify(title),
        section,
        title
      };
    }

    return {
      albumId: `other-${slugify(title)}`,
      albumSlug: slugify(title),
      section: "other" as const,
      title
    };
  }

  const pathParts =
    "stems" in song ? song.stems[0]?.file.split("/").filter(Boolean) ?? [] : [];
  const libraryIndex = pathParts.findIndex((part) =>
    part.startsWith("song-library")
  );
  const section = pathParts[libraryIndex + 1] as ReleaseSection | undefined;
  const title = prettifyPathPart(pathParts[libraryIndex + 2]);

  if (section === "released" || section === "unreleased") {
    return {
      albumId: `${section}-${slugify(title)}`,
      albumSlug: slugify(title),
      section,
      title
    };
  }

  return {
    albumId: `other-${slugify(title)}`,
    albumSlug: slugify(title),
    section: "other" as const,
    title
  };
}

export function getAlbums<TSong extends LibrarySong>(songs: TSong[]) {
  const albums = new Map<string, Album<TSong>>();

  for (const song of songs) {
    const placement = getSongPlacement(song);
    const album = albums.get(placement.albumId) ?? {
      id: placement.albumId,
      title: placement.title,
      section: placement.section,
      artwork: albumArtwork[placement.albumSlug],
      songs: []
    };

    album.songs.push(song);
    albums.set(placement.albumId, album);
  }

  return [...albums.values()]
    .map((album) => ({
      ...album,
      songs: album.songs.sort((a, b) => a.title.localeCompare(b.title))
    }))
    .sort((a, b) => {
      const sectionDelta =
        sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);

      if (sectionDelta !== 0) {
        return sectionDelta;
      }

      return a.title.localeCompare(b.title);
    });
}

export function getAlbumById(songs: Song[], id: string) {
  return getAlbums(songs).find((album) => album.id === id);
}
