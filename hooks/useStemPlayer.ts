"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PracticePreset, Song, StemState } from "@/lib/types";

type BufferMap = Record<string, AudioBuffer>;
type GainMap = Record<string, GainNode>;
type SourceMap = Record<string, AudioBufferSourceNode>;
type ErrorMap = Record<string, string>;

const defaultAudioBaseUrl =
  "https://pub-6c46ccb0377243cd898f83c8198c5e6f.r2.dev";
const audioBaseUrl = (
  process.env.NEXT_PUBLIC_AUDIO_BASE_URL || defaultAudioBaseUrl
).replace(/\/+$/, "");

function resolveStemFile(file: string) {
  if (!audioBaseUrl || /^(https?:|data:|blob:)/i.test(file)) {
    return file;
  }

  return `${audioBaseUrl}${file.startsWith("/") ? file : `/${file}`}`;
}

function createInitialStemStates(song: Song): Record<string, StemState> {
  return Object.fromEntries(
    song.stems.map((stem) => [
      stem.id,
      {
        stemId: stem.id,
        muted: false,
        soloed: false,
        volume: 100
      }
    ])
  );
}

function clampTime(time: number, duration: number) {
  return Math.min(Math.max(time, 0), Math.max(duration, 0));
}

export function useStemPlayer(song: Song) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<BufferMap>({});
  const gainNodesRef = useRef<GainMap>({});
  const sourcesRef = useRef<SourceMap>({});
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(0);
  const stemStatesRef = useRef(createInitialStemStates(song));

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [loadedStemIds, setLoadedStemIds] = useState<Set<string>>(
    () => new Set()
  );
  const [stemStates, setStemStates] = useState<Record<string, StemState>>(
    () => createInitialStemStates(song)
  );

  const hasLoadedStems = loadedStemIds.size > 0;

  const audibleStemIds = useMemo(() => {
    const soloedIds = Object.values(stemStates)
      .filter((state) => state.soloed)
      .map((state) => state.stemId);
    const hasSolo = soloedIds.length > 0;

    return new Set(
      Object.values(stemStates)
        .filter((state) => {
          if (state.muted) {
            return false;
          }

          return hasSolo ? state.soloed : true;
        })
        .map((state) => state.stemId)
    );
  }, [stemStates]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const updateGainNodes = useCallback(() => {
    const soloed = Object.values(stemStatesRef.current).some(
      (state) => state.soloed
    );

    for (const [stemId, gainNode] of Object.entries(gainNodesRef.current)) {
      const state = stemStatesRef.current[stemId];
      const shouldPlay = state && !state.muted && (!soloed || state.soloed);
      gainNode.gain.value = shouldPlay ? state.volume / 100 : 0;
    }
  }, []);

  const stopSources = useCallback(() => {
    for (const source of Object.values(sourcesRef.current)) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // Already stopped sources cannot be stopped again.
      }
    }
    sourcesRef.current = {};
  }, []);

  const tick = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !isPlayingRef.current) {
      return;
    }

    const nextTime = clampTime(
      context.currentTime - startedAtRef.current,
      durationRef.current
    );

    setCurrentTime(nextTime);

    if (durationRef.current > 0 && nextTime >= durationRef.current) {
      isPlayingRef.current = false;
      pausedAtRef.current = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      stopSources();
      stopAnimation();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [stopAnimation, stopSources]);

  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  }, []);

  const startSources = useCallback(
    async (offset: number) => {
      const context = ensureContext();
      await context.resume();

      stopSources();

      const scheduledTime = context.currentTime + 0.03;
      startedAtRef.current = scheduledTime - offset;

      for (const [stemId, buffer] of Object.entries(buffersRef.current)) {
        const source = context.createBufferSource();
        const gainNode =
          gainNodesRef.current[stemId] ?? context.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.start(scheduledTime, clampTime(offset, buffer.duration));

        sourcesRef.current[stemId] = source;
        gainNodesRef.current[stemId] = gainNode;
      }

      updateGainNodes();
      isPlayingRef.current = true;
      setIsPlaying(true);
      stopAnimation();
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [ensureContext, stopAnimation, stopSources, tick, updateGainNodes]
  );

  const play = useCallback(async () => {
    if (Object.keys(buffersRef.current).length === 0) {
      return;
    }

    const offset =
      durationRef.current > 0 && pausedAtRef.current >= durationRef.current
        ? 0
        : pausedAtRef.current;

    await startSources(offset);
  }, [startSources]);

  const pause = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !isPlayingRef.current) {
      return;
    }

    pausedAtRef.current = clampTime(
      context.currentTime - startedAtRef.current,
      durationRef.current
    );
    setCurrentTime(pausedAtRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopSources();
    stopAnimation();
  }, [stopAnimation, stopSources]);

  const stop = useCallback(() => {
    pausedAtRef.current = 0;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    stopSources();
    stopAnimation();
  }, [stopAnimation, stopSources]);

  const seek = useCallback(
    async (time: number) => {
      const nextTime = clampTime(time, durationRef.current);
      const wasPlaying = isPlayingRef.current;
      pausedAtRef.current = nextTime;
      setCurrentTime(nextTime);

      if (wasPlaying) {
        await startSources(nextTime);
      }
    },
    [startSources]
  );

  const setStemMuted = useCallback(
    (stemId: string, muted: boolean) => {
      setStemStates((current) => {
        const next = {
          ...current,
          [stemId]: {
            ...current[stemId],
            muted
          }
        };
        stemStatesRef.current = next;
        return next;
      });
      requestAnimationFrame(updateGainNodes);
    },
    [updateGainNodes]
  );

  const setStemSoloed = useCallback(
    (stemId: string, soloed: boolean) => {
      setStemStates((current) => {
        const next = {
          ...current,
          [stemId]: {
            ...current[stemId],
            soloed
          }
        };
        stemStatesRef.current = next;
        return next;
      });
      requestAnimationFrame(updateGainNodes);
    },
    [updateGainNodes]
  );

  const setStemVolume = useCallback(
    (stemId: string, volume: number) => {
      setStemStates((current) => {
        const next = {
          ...current,
          [stemId]: {
            ...current[stemId],
            volume: Math.min(Math.max(volume, 0), 100)
          }
        };
        stemStatesRef.current = next;
        return next;
      });
      requestAnimationFrame(updateGainNodes);
    },
    [updateGainNodes]
  );

  const applyPreset = useCallback(
    (preset: PracticePreset) => {
      setStemStates((current) => {
        const next = Object.fromEntries(
          song.stems.map((stem) => {
            const base = current[stem.id] ?? {
              stemId: stem.id,
              muted: false,
              soloed: false,
              volume: 100
            };

            if (preset === "fullMix") {
              return [
                stem.id,
                { ...base, muted: false, soloed: false, volume: 100 }
              ];
            }

            if (preset === "noVocals") {
              return [
                stem.id,
                {
                  ...base,
                  muted: stem.type === "vocals",
                  soloed: false
                }
              ];
            }

            if (preset === "noGuitar") {
              return [
                stem.id,
                {
                  ...base,
                  muted: stem.type === "guitar",
                  soloed: false
                }
              ];
            }

            return [
              stem.id,
              {
                ...base,
                muted: false,
                soloed: stem.type === "drums" || stem.type === "bass"
              }
            ];
          })
        );

        stemStatesRef.current = next;
        return next;
      });
      requestAnimationFrame(updateGainNodes);
    },
    [song.stems, updateGainNodes]
  );

  useEffect(() => {
    const context = ensureContext();
    let cancelled = false;
    const nextStates = createInitialStemStates(song);

    setIsLoading(true);
    setErrors({});
    setLoadedStemIds(new Set());
    setStemStates(nextStates);
    stemStatesRef.current = nextStates;
    buffersRef.current = {};
    gainNodesRef.current = {};
    durationRef.current = 0;
    pausedAtRef.current = 0;
    setDuration(0);
    setCurrentTime(0);

    async function loadStem(stemId: string, file: string) {
      const stemFile = resolveStemFile(file);
      const response = await fetch(stemFile);

      if (!response.ok) {
        throw new Error(`Could not load ${stemFile}`);
      }

      const data = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(data);

      if (!cancelled) {
        buffersRef.current = {
          ...buffersRef.current,
          [stemId]: buffer
        };
        setLoadedStemIds((current) => new Set(current).add(stemId));
      }

      return buffer;
    }

    Promise.allSettled(
      song.stems.map(async (stem) => {
        const buffer = await loadStem(stem.id, stem.file);
        return { stemId: stem.id, buffer };
      })
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const nextBuffers: BufferMap = {};
      const nextErrors: ErrorMap = {};

      results.forEach((result, index) => {
        const stem = song.stems[index];

        if (result.status === "fulfilled") {
          nextBuffers[result.value.stemId] = result.value.buffer;
        } else {
          nextErrors[stem.id] =
            result.reason instanceof Error
              ? result.reason.message
              : "This stem could not be loaded.";
        }
      });

      const nextDuration = Object.values(nextBuffers).reduce(
        (longest, buffer) => Math.max(longest, buffer.duration),
        0
      );

      buffersRef.current = nextBuffers;
      durationRef.current = nextDuration;
      setDuration(nextDuration);
      setErrors(nextErrors);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [ensureContext, song, stop]);

  useEffect(() => {
    updateGainNodes();
  }, [stemStates, updateGainNodes]);

  useEffect(() => {
    return () => {
      stopAnimation();
      stopSources();
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, [stopAnimation, stopSources]);

  return {
    applyPreset,
    audibleStemIds,
    currentTime,
    duration,
    errors,
    hasLoadedStems,
    isLoading,
    isPlaying,
    loadedStemCount: loadedStemIds.size,
    loadedStemIds,
    totalStemCount: song.stems.length,
    pause,
    play,
    seek,
    setStemMuted,
    setStemSoloed,
    setStemVolume,
    stemStates,
    stop
  };
}
