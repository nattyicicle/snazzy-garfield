import type { PracticePreset } from "@/lib/types";

type PresetButtonsProps = {
  onPreset: (preset: PracticePreset) => void;
};

const presets: Array<{ id: PracticePreset; label: string }> = [
  { id: "fullMix", label: "Full Mix" },
  { id: "noVocals", label: "No Vocals" },
  { id: "noGuitar", label: "No Guitar" },
  { id: "drumsAndBass", label: "Drums + Bass" }
];

export function PresetButtons({ onPreset }: PresetButtonsProps) {
  return (
    <section className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onPreset(preset.id)}
          className="rounded border border-white/15 bg-rail px-3 py-2 text-sm font-semibold text-white hover:border-amberline/70"
        >
          {preset.label}
        </button>
      ))}
    </section>
  );
}
