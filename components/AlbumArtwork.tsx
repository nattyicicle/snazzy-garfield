type AlbumArtworkProps = {
  artwork?: string;
  title: string;
};

export function AlbumArtwork({ artwork, title }: AlbumArtworkProps) {
  if (artwork) {
    return (
      <img
        src={artwork}
        alt={`${title} album artwork`}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 via-stone-900 to-black px-4 text-center">
      <span className="text-sm font-semibold uppercase tracking-wide text-stone-400">
        {title}
      </span>
    </div>
  );
}
