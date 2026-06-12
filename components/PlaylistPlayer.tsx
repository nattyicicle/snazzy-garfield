"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveAudioSource } from "@/lib/audio";

export type PlaylistPlayerTrack = {
  id: string;
  title: string;
  href: string;
  side: string;
  position: number;
  source?: string | null;
  hasChordSheet: boolean;
  hasLyrics: boolean;
  hasMixer: boolean;
};

type PlaylistPlayerProps = {
  tracks: PlaylistPlayerTrack[];
};

function MaterialIcon({
  label,
  symbol
}: {
  label: string;
  symbol: string;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className="inline-grid size-6 place-items-center rounded border border-white/10 bg-black/20 text-[0.7rem] font-bold text-stone-300"
    >
      {symbol}
    </span>
  );
}

function groupTracks(tracks: PlaylistPlayerTrack[]) {
  const groups = new Map<string, PlaylistPlayerTrack[]>();

  for (const track of tracks) {
    groups.set(track.side, [...(groups.get(track.side) ?? []), track]);
  }

  return [...groups.entries()].map(([side, sideTracks]) => ({
    side,
    tracks: sideTracks.sort((a, b) => a.position - b.position)
  }));
}

export function PlaylistPlayer({ tracks }: PlaylistPlayerProps) {
  const playableTracks = useMemo(
    () => tracks.filter((track) => Boolean(track.source)),
    [tracks]
  );
  const groupedTracks = useMemo(() => groupTracks(tracks), [tracks]);
  const [selectedId, setSelectedId] = useState(playableTracks[0]?.id ?? "");
  const [shouldPlay, setShouldPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedTrack =
    playableTracks.find((track) => track.id === selectedId) ?? playableTracks[0];
  const selectedIndex = selectedTrack
    ? playableTracks.findIndex((track) => track.id === selectedTrack.id)
    : -1;
  const selectedSource = selectedTrack?.source
    ? resolveAudioSource(selectedTrack.source)
    : "";

  useEffect(() => {
    if (!shouldPlay || !audioRef.current) {
      return;
    }

    audioRef.current.play().catch(() => {
      setShouldPlay(false);
    });
  }, [selectedId, shouldPlay]);

  function playTrack(track: PlaylistPlayerTrack) {
    if (!track.source) {
      return;
    }

    setSelectedId(track.id);
    setShouldPlay(true);

    if (track.id === selectedTrack?.id && audioRef.current) {
      audioRef.current.play().catch(() => setShouldPlay(false));
    }
  }

  function replay() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = 0;
    setShouldPlay(true);
    audioRef.current.play().catch(() => setShouldPlay(false));
  }

  function move(delta: number) {
    if (selectedIndex < 0 || playableTracks.length === 0) {
      return;
    }

    const nextIndex =
      (selectedIndex + delta + playableTracks.length) % playableTracks.length;
    playTrack(playableTracks[nextIndex]);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="sticky top-4 z-10 rounded-lg border border-white/10 bg-panel/95 p-4 shadow-xl shadow-black/20 backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous song"
              title="Previous song"
              className="grid size-11 place-items-center rounded-full border border-white/10 bg-rail text-xl font-semibold text-stone-100 hover:border-amberline/70 hover:text-amberline"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={replay}
              aria-label="Replay song"
              title="Replay song"
              className="grid size-11 place-items-center rounded-full border border-white/10 bg-rail text-lg font-semibold text-stone-100 hover:border-amberline/70 hover:text-amberline"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next song"
              title="Next song"
              className="grid size-11 place-items-center rounded-full border border-white/10 bg-rail text-xl font-semibold text-stone-100 hover:border-amberline/70 hover:text-amberline"
            >
              ›
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amberline">
              Now playing
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {selectedTrack?.title ?? "No song selected"}
            </h3>
            {selectedTrack ? (
              <p className="mt-2 text-sm text-stone-400">
                Setlist {selectedTrack.side} /{" "}
                {String(selectedTrack.position).padStart(2, "0")}
              </p>
            ) : null}
          </div>
          {selectedTrack ? (
            <Link
              href={selectedTrack.href}
              aria-label={`Open ${selectedTrack.title}`}
              title={`Open ${selectedTrack.title}`}
              className="grid size-11 place-items-center rounded-full border border-amberline/50 text-lg font-semibold text-amberline hover:bg-amberline hover:text-ink"
            >
              ↗
            </Link>
          ) : null}
        </div>

        <audio
          ref={audioRef}
          className="mt-4 w-full"
          controls
          onEnded={() => move(1)}
          preload="metadata"
          src={selectedSource}
        >
          <track kind="captions" />
        </audio>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groupedTracks.map((group) => (
          <section
            key={group.side}
            className="overflow-hidden rounded-lg border border-white/10 bg-panel"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-base font-semibold text-white">
                Setlist {group.side}
              </h3>
            </div>
            <div className="divide-y divide-white/10">
              {group.tracks.map((track) => {
                const isSelected = track.id === selectedTrack?.id;

                return (
                  <div
                    key={track.id}
                    className={`px-3 py-2 text-sm transition ${
                      isSelected ? "bg-amberline/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="grid gap-2 sm:grid-cols-[42px_32px_minmax(0,1fr)_auto] sm:items-center">
                      <span className="font-mono text-[0.7rem] text-stone-500">
                        {String(track.position).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => playTrack(track)}
                        disabled={!track.source}
                        aria-label={`Play ${track.title}`}
                        title={`Play ${track.title}`}
                        className={`grid size-8 place-items-center rounded-full border text-sm font-bold ${
                          isSelected
                            ? "border-amberline bg-amberline text-ink"
                            : "border-white/10 bg-rail text-stone-200 hover:border-amberline/70 hover:text-amberline"
                        } disabled:cursor-not-allowed disabled:border-white/10 disabled:text-stone-600`}
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        onClick={() => playTrack(track)}
                        disabled={!track.source}
                        className={`min-w-0 text-left font-semibold ${
                          isSelected
                            ? "text-amberline"
                            : "text-stone-100 hover:text-amberline"
                        } disabled:cursor-not-allowed disabled:text-stone-500`}
                      >
                        {track.title}
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        {track.hasChordSheet ? (
                          <MaterialIcon label="SongbookPro sheet" symbol="♬" />
                        ) : null}
                        {track.hasLyrics ? (
                          <MaterialIcon label="Lyrics" symbol="¶" />
                        ) : null}
                        <MaterialIcon
                          label={track.hasMixer ? "Mixer" : "Audio"}
                          symbol={track.hasMixer ? "≋" : "♪"}
                        />
                        <Link
                          href={track.href}
                          aria-label={`Open ${track.title}`}
                          title={`Open ${track.title}`}
                          className="grid size-8 place-items-center rounded-full text-lg font-semibold text-amberline hover:bg-amberline/10"
                        >
                          ↗
                        </Link>
                      </div>
                    </div>
                    {!track.source ? (
                      <span className="text-xs text-stone-500">
                        No audio linked yet.
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
