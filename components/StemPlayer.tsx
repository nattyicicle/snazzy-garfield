"use client";

import { MixerChannel } from "@/components/MixerChannel";
import { PresetButtons } from "@/components/PresetButtons";
import { TransportControls } from "@/components/TransportControls";
import { useStemPlayer } from "@/hooks/useStemPlayer";
import type { Song } from "@/lib/types";

type StemPlayerProps = {
  song: Song;
};

export function StemPlayer({ song }: StemPlayerProps) {
  const player = useStemPlayer(song);
  const failedStemCount = Object.keys(player.errors).length;

  return (
    <div className="flex flex-col gap-5">
      <TransportControls
        canPlay={player.hasLoadedStems}
        currentTime={player.currentTime}
        duration={player.duration}
        isLoading={player.isLoading}
        isPlaying={player.isPlaying}
        loadedStemCount={player.loadedStemCount}
        onPlayPause={() => {
          if (player.isPlaying) {
            player.pause();
          } else {
            void player.play();
          }
        }}
        onSeek={(time) => {
          void player.seek(time);
        }}
        onStop={player.stop}
        totalStemCount={player.totalStemCount}
      />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Practice presets</h2>
            <p className="mt-1 text-sm text-stone-400">
              Presets update the mixer instantly and keep custom volume moves.
            </p>
          </div>
          <PresetButtons onPreset={player.applyPreset} />
        </div>
      </div>

      {failedStemCount > 0 ? (
        <section className="rounded-lg border border-amberline/40 bg-amberline/10 p-4">
          <h2 className="font-semibold text-amberline">
            {player.hasLoadedStems
              ? `${failedStemCount} stem file${failedStemCount === 1 ? "" : "s"} missing`
              : "No audio files loaded yet"}
          </h2>
          <p className="mt-2 text-sm text-stone-200">
            Add the audio files listed in{" "}
            <span className="font-mono text-xs">
              public/song-library/songs.json
            </span>{" "}
            and this player will load them automatically.
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-stone-300 md:grid-cols-2">
            {song.stems
              .filter((stem) => player.errors[stem.id])
              .map((stem) => (
                <li key={stem.id} className="rounded bg-black/20 px-3 py-2">
                  <span className="font-semibold text-white">{stem.name}</span>
                  <span className="ml-2 font-mono text-xs text-stone-400">
                    {stem.file}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Mixer</h2>
          <span className="text-sm text-stone-400">
            {player.hasLoadedStems
              ? `${song.stems.length - failedStemCount} loaded`
              : "Waiting for stems"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {song.stems.map((stem) => {
            const state = player.stemStates[stem.id];

            if (!state) {
              return null;
            }

            return (
              <MixerChannel
                key={stem.id}
                isAudible={
                  player.loadedStemIds.has(stem.id) &&
                  player.audibleStemIds.has(stem.id)
                }
                onMute={(muted) => player.setStemMuted(stem.id, muted)}
                onSolo={(soloed) => player.setStemSoloed(stem.id, soloed)}
                onVolume={(volume) => player.setStemVolume(stem.id, volume)}
                state={state}
                stem={stem}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
