import { ChordSheet } from "@/components/ChordSheet";
import { resolveAudioSource } from "@/lib/audio";
import type { LyricSection, Song } from "@/lib/types";

type SongMaterialsProps = {
  song: Song;
};

function hasLyrics(lyrics: LyricSection[] | undefined) {
  return lyrics?.some((section) => section.lines.length > 0) ?? false;
}

export function SongMaterials({ song }: SongMaterialsProps) {
  const referenceAudio = song.referenceAudio ?? song.master;
  const lyricSections = song.lyrics ?? [];
  const hasLyricSheet = hasLyrics(lyricSections);
  const hasChordSheet = Boolean(song.chordPro?.trim());

  if (!referenceAudio && !hasLyricSheet && !hasChordSheet) {
    return null;
  }

  return (
    <section className="flex flex-col gap-5">
      {referenceAudio || hasChordSheet ? (
        <div className="rounded-lg border border-white/10 bg-panel p-4">
          {referenceAudio ? (
            <div className={hasChordSheet ? "border-b border-white/10 pb-4" : ""}>
              <h2 className="text-lg font-semibold text-white">
                Audio
              </h2>
              <audio
                className="mt-4 w-full"
                controls
                preload="metadata"
                src={resolveAudioSource(referenceAudio)}
              />
            </div>
          ) : null}

          {hasChordSheet ? (
            <div className={referenceAudio ? "pt-4" : ""}>
              <h2 className="mb-3 text-lg font-semibold text-white">
                SongbookPro sheet
              </h2>
              <ChordSheet content={song.chordPro ?? ""} />
            </div>
          ) : null}
        </div>
      ) : null}

      {hasLyricSheet ? (
        <div className="rounded-lg border border-white/10 bg-panel p-4">
          <h2 className="mb-4 text-lg font-semibold text-white">Lyrics</h2>
          <div className="flex flex-col gap-5">
            {lyricSections.map((section, index) => (
              <section
                key={`${section.label}-${index}`}
                className="border-l-2 border-amberline/50 pl-4"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amberline">
                  {section.label}
                </h3>
                <div className="mt-3 flex flex-col gap-1 text-sm leading-7 text-stone-100">
                  {section.lines.map((line, lineIndex) =>
                    line ? (
                      <p key={lineIndex}>{line}</p>
                    ) : (
                      <div key={lineIndex} className="h-3" aria-hidden="true" />
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
