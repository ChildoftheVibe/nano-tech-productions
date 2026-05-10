import Link from "next/link";

/** Renders a name as a link to /artist/<slug> if the name matches a published
 *  artist row, otherwise plain text. The lookup table is a lowercased-name →
 *  slug map produced by `getPublishedArtistSlugByName()`. */
export function MaybeArtistLink({
  name,
  slugsByName,
  className,
}: {
  name: string;
  slugsByName: Record<string, string>;
  className?: string;
}) {
  const slug = slugsByName[name.toLowerCase()];
  if (slug) {
    return (
      <Link
        href={`/artist/${slug}`}
        className={`hover:text-[#3DD6C8] hover:underline ${className ?? ""}`}
      >
        {name}
      </Link>
    );
  }
  return <span className={className}>{name}</span>;
}

/** Renders a comma-separated list of names, each conditionally linked. */
export function MaybeArtistLinkList({
  names,
  slugsByName,
  className,
}: {
  names: string[];
  slugsByName: Record<string, string>;
  className?: string;
}) {
  return (
    <span className={className}>
      {names.map((name, i) => (
        <span key={`${name}-${i}`}>
          {i > 0 ? ", " : ""}
          <MaybeArtistLink name={name} slugsByName={slugsByName} />
        </span>
      ))}
    </span>
  );
}
