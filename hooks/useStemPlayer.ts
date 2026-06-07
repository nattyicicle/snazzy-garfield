"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PracticePreset, Song, StemState } from "@/lib/types";

type AudioElementMap = Record<string, HTMLAudioElement>;
type ErrorMap = Record<string, string>;

const hardSyncThreshold = 0.08;
const softSyncThreshold = 0.025;
const syncPlaybackRate = 0.04;
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

function getAudioErrorMessage(audio: HTMLAudioElement, src: string) {
  switch (audio.error?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return `Loading was cancelled for ${src}`;
    case MediaError.MEDIA_ERR_NETWORK:
      return `Network error while loading ${src}`;
    case MediaError.MEDIA_ERR_DECODE:
      return `Browser could not decode ${src}`;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return `Browser does not support ${src}`;
    default:
      return `Could not load ${src}`;
  }
}

export function useStemPlayer(song: Song) {
  const audioElementsRef = useRef<AudioElementMap>({});
  const primaryStemIdRef = useRef<string | null>(null);
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

  const updateAudioElements = useCallback(() => {
    const soloed = Object.values(stemStatesRef.current).some(
      (state) => state.soloed
    );

    for (const [stemId, audio] of Object.entries(audioElementsRef.current)) {
      const state = stemStatesRef.current[stemId];
      const shouldPlay = state && !state.muted && (!soloed || state.soloed);

      audio.muted = !shouldPlay;
      audio.volume = shouldPlay ? state.volume / 100 : 0;
    }
  }, []);

  const pauseElements = useCallback(() => {
    for (const audio of Object.values(audioElementsRef.current)) {
      audio.pause();
    }
  }, []);

  const tick = useCallback(() => {
    if (!isPlayingRef.current) {
      return;
    }

    const audioEntries = Object.entries(audioElementsRef.current);
    const primaryAudio =
      (primaryStemIdRef.current
        ? audioElementsRef.current[primaryStemIdRef.current]
        : null) ??
      audioEntries.find(([, audio]) => !audio.paused)?.[1] ??
      audioEntries[0]?.[1];
    const nextTime = clampTime(
      primaryAudio?.currentTime ?? pausedAtRef.current,
      durationRef.current
    );

    if (primaryAudio) {
      for (const [, audio] of audioEntries) {
        if (audio === primaryAudio || audio.paused || audio.readyState < 2) {
          continue;
        }

        const drift = audio.currentTime - nextTime;

        if (Math.abs(drift) > hardSyncThreshold) {
          audio.currentTime = nextTime;
          audio.playbackRate = 1;
        } else if (Math.abs(drift) > softSyncThreshold) {
          audio.playbackRate = drift > 0 ? 1 - syncPlaybackRate : 1 + syncPlaybackRate;
        } else {
          audio.playbackRate = 1;
        }
      }
    }

    setCurrentTime(nextTime);

    if (durationRef.current > 0 && nextTime >= durationRef.current) {
      isPlayingRef.current = false;
      pausedAtRef.current = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      pauseElements();
      stopAnimation();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [pauseElements, stopAnimation]);

  const setElementTimes = useCallback((time: number) => {
    for (const audio of Object.values(audioElementsRef.current)) {
      try {
        audio.currentTime = clampTime(time, audio.duration || durationRef.current);
      } catch {
        // Some browsers reject seeking before the media is fully ready.
      }
    }
  }, []);

  const play = useCallback(async () => {
    const audioElements = Object.values(audioElementsRef.current);

    if (audioElements.length === 0) {
      return;
    }

    const offset =
      durationRef.current > 0 && pausedAtRef.current >= durationRef.current
        ? 0
        : pausedAtRef.current;

    setElementTimes(offset);
    updateAudioElements();

    try {
      await Promise.allSettled(audioElements.map((audio) => audio.play()));
      const primaryAudio =
        (primaryStemIdRef.current
          ? audioElementsRef.current[primaryStemIdRef.current]
          : null) ?? audioElements[0];
      const startTime = primaryAudio?.currentTime ?? offset;

      for (const audio of audioElements) {
        if (audio !== primaryAudio && Math.abs(audio.currentTime - startTime) > 0.02) {
          audio.currentTime = startTime;
        }
      }

      pausedAtRef.current = offset;
      isPlayingRef.current = true;
      setIsPlaying(true);
      stopAnimation();
      animationFrameRef.current = requestAnimationFrame(tick);
    } catch {
      isPlayingRef.current = false;
      setIsPlaying(false);
      pauseElements();
    }
  }, [pauseElements, setElementTimes, stopAnimation, tick, updateAudioElements]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) {
      return;
    }

    const primaryAudio = Object.values(audioElementsRef.current)[0];
    pausedAtRef.current = clampTime(
      primaryAudio?.currentTime ?? pausedAtRef.current,
      durationRef.current
    );
    setCurrentTime(pausedAtRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
    pauseElements();
    stopAnimation();
  }, [pauseElements, stopAnimation]);

  const stop = useCallback(() => {
    pausedAtRef.current = 0;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    pauseElements();
    setElementTimes(0);
    for (const audio of Object.values(audioElementsRef.current)) {
      audio.playbackRate = 1;
    }
    stopAnimation();
  }, [pauseElements, setElementTimes, stopAnimation]);

  const seek = useCallback(
    async (time: number) => {
      const nextTime = clampTime(time, durationRef.current);
      const wasPlaying = isPlayingRef.current;
      pausedAtRef.current = nextTime;
      setCurrentTime(nextTime);
      setElementTimes(nextTime);

      if (wasPlaying) {
        await play();
      }
    },
    [play, setElementTimes]
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
      requestAnimationFrame(updateAudioElements);
    },
    [updateAudioElements]
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
      requestAnimationFrame(updateAudioElements);
    },
    [updateAudioElements]
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
      requestAnimationFrame(updateAudioElements);
    },
    [updateAudioElements]
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
      requestAnimationFrame(updateAudioElements);
    },
    [song.stems, updateAudioElements]
  );

  useEffect(() => {
    let cancelled = false;
    const nextStates = createInitialStemStates(song);

    stop();
    setIsLoading(true);
    setErrors({});
    setLoadedStemIds(new Set());
    setStemStates(nextStates);
    stemStatesRef.current = nextStates;
    audioElementsRef.current = {};
    primaryStemIdRef.current = null;
    durationRef.current = 0;
    pausedAtRef.current = 0;
    setDuration(0);
    setCurrentTime(0);

    function loadStem(stemId: string, file: string) {
      const src = resolveStemFile(file);

      return new Promise<{ stemId: string; audio: HTMLAudioElement }>(
        (resolve, reject) => {
          const audio = new Audio();

          audio.crossOrigin = "anonymous";
          audio.preload = "metadata";
          audio.src = src;

          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", handleLoaded);
            audio.removeEventListener("canplay", handleLoaded);
            audio.removeEventListener("error", handleError);
          };

          const handleLoaded = () => {
            cleanup();
            resolve({ stemId, audio });
          };

          const handleError = () => {
            cleanup();
            reject(new Error(getAudioErrorMessage(audio, src)));
          };

          audio.addEventListener("loadedmetadata", handleLoaded, { once: true });
          audio.addEventListener("canplay", handleLoaded, { once: true });
          audio.addEventListener("error", handleError, { once: true });
          audio.load();
        }
      );
    }

    Promise.allSettled(
      song.stems.map((stem) => loadStem(stem.id, stem.file))
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const nextElements: AudioElementMap = {};
      const nextErrors: ErrorMap = {};
      const nextLoadedIds = new Set<string>();

      results.forEach((result, index) => {
        const stem = song.stems[index];

        if (result.status === "fulfilled") {
          nextElements[result.value.stemId] = result.value.audio;
          nextLoadedIds.add(result.value.stemId);
        } else {
          nextErrors[stem.id] =
            result.reason instanceof Error
              ? result.reason.message
              : "This stem could not be loaded.";
        }
      });

      const nextDuration = Object.values(nextElements).reduce(
        (longest, audio) => Math.max(longest, audio.duration || 0),
        0
      );

      audioElementsRef.current = nextElements;
      primaryStemIdRef.current = song.stems.find((stem) =>
        nextLoadedIds.has(stem.id)
      )?.id ?? null;
      durationRef.current = nextDuration;
      setDuration(nextDuration);
      setLoadedStemIds(nextLoadedIds);
      setErrors(nextErrors);
      setIsLoading(false);
      updateAudioElements();
    });

    return () => {
      cancelled = true;
      for (const audio of Object.values(audioElementsRef.current)) {
        audio.pause();
        audio.playbackRate = 1;
        audio.removeAttribute("src");
        audio.load();
      }
      audioElementsRef.current = {};
    };
  }, [song, stop, updateAudioElements]);

  useEffect(() => {
    updateAudioElements();
  }, [stemStates, updateAudioElements]);

  useEffect(() => {
    return () => {
      stopAnimation();
      pauseElements();
    };
  }, [pauseElements, stopAnimation]);

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
