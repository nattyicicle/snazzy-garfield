type TransportControlsProps = {
  canPlay: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isPlaying: boolean;
  loadedStemCount: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onStop: () => void;
  totalStemCount: number;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function TransportControls({
  canPlay,
  currentTime,
  duration,
  isLoading,
  isPlaying,
  loadedStemCount,
  onPlayPause,
  onSeek,
  onStop,
  totalStemCount
}: TransportControlsProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPlayPause}
            disabled={!canPlay || isLoading}
            className="min-w-24 rounded bg-amberline px-4 py-3 font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={!canPlay && currentTime === 0}
            className="rounded border border-white/15 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-12 text-sm tabular-nums text-stone-300">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={Math.max(duration, 0)}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!canPlay || duration === 0}
            className="min-w-0 flex-1"
            aria-label="Seek"
          />
          <span className="w-12 text-right text-sm tabular-nums text-stone-300">
            {formatTime(duration)}
          </span>
        </div>
      </div>
      {isLoading ? (
        <p className="mt-3 text-sm text-stone-300">
          Loading stems {loadedStemCount}/{totalStemCount}
        </p>
      ) : null}
    </section>
  );
}
