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

export type Song = {
  id: string;
  title: string;
  artist?: string | null;
  bpm?: number | null;
  key?: string | null;
  master?: string | null;
  stems: Stem[];
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
