import Link from "next/link";

type LibraryTabsProps = {
  active: "playlist" | "library";
};

export function LibraryTabs({ active }: LibraryTabsProps) {
  const tabs = [
    { id: "playlist", label: "Playlist", href: "/songs" },
    { id: "library", label: "Song library", href: "/songs/library" }
  ] as const;

  return (
    <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-rail p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`rounded px-4 py-3 text-center text-sm font-semibold ${
            active === tab.id
              ? "bg-amberline text-ink"
              : "text-stone-300 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
