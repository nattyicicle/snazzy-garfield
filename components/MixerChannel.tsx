import type { Stem, StemState } from "@/lib/types";

type MixerChannelProps = {
  isAudible: boolean;
  onMute: (muted: boolean) => void;
  onSolo: (soloed: boolean) => void;
  onVolume: (volume: number) => void;
  state: StemState;
  stem: Stem;
};

export function MixerChannel({
  isAudible,
  onMute,
  onSolo,
  onVolume,
  state,
  stem
}: MixerChannelProps) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        state.soloed
          ? "border-mintline/70 bg-mintline/10"
          : state.muted
            ? "border-white/10 bg-black/20 opacity-70"
            : "border-white/10 bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{stem.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
            {stem.type}
          </p>
        </div>
        <span
          className={`rounded border px-2 py-1 text-xs font-semibold ${
            isAudible
              ? "border-mintline/50 text-mintline"
              : "border-white/10 text-stone-500"
          }`}
        >
          {isAudible ? "Audible" : "Silent"}
        </span>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => onMute(!state.muted)}
          className={`flex-1 rounded px-3 py-2 text-sm font-bold ${
            state.muted
              ? "bg-amberline text-ink"
              : "border border-white/15 text-white"
          }`}
        >
          Mute
        </button>
        <button
          type="button"
          onClick={() => onSolo(!state.soloed)}
          className={`flex-1 rounded px-3 py-2 text-sm font-bold ${
            state.soloed
              ? "bg-mintline text-ink"
              : "border border-white/15 text-white"
          }`}
        >
          Solo
        </button>
      </div>
      <label className="mt-5 block text-sm text-stone-300">
        <span className="flex justify-between">
          <span>Volume</span>
          <span className="tabular-nums">{state.volume}%</span>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={state.volume}
          onChange={(event) => onVolume(Number(event.target.value))}
          className="mt-3 w-full"
        />
      </label>
    </article>
  );
}
