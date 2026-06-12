export type StemType =
  | "drums"
  | "bass"
  | "guitar"
  | "vocals"
  | "keys"
  | "synth"
  | "brass"
  | "percussion"
  | "other";

export type Stem = {
  id: string;
  name: string;
  type: StemType;
  file: string;
};

export type LyricSection = {
  label: string;
  lines: string[];
};

export type Song = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  section?: "released" | "unreleased" | "other" | null;
  bpm?: number | null;
  key?: string | null;
  time?: string | null;
  master?: string | null;
  referenceAudio?: string | null;
  lyrics?: LyricSection[];
  chordPro?: string | null;
  songbookProId?: number | null;
  stems: Stem[];
};

export type SongSummary = Omit<Song, "lyrics" | "chordPro" | "stems"> & {
  hasChordSheet: boolean;
  hasLyrics: boolean;
  hasReferenceAudio: boolean;
  stemCount: number;
  stemTypes: StemType[];
};

export type PlaylistTrack = {
  position: number;
  side?: string | null;
  title: string;
  songId?: string | null;
  sourceFile?: string | null;
  driveUrl?: string | null;
};

export type Playlist = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  tracks: PlaylistTrack[];
};

export type StemState = {
  stemId: string;
  muted: boolean;
  soloed: boolean;
  volume: number;
};

export type PlayerState = {
  isLoading: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  errors: Record<string, string>;
  stemStates: Record<string, StemState>;
};

export type PracticePreset =
  | "fullMix"
  | "noVocals"
  | "noGuitar"
  | "drumsAndBass";
