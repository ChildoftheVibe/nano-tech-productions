"use client";

import { useState } from "react";
import { Apple, Globe } from "lucide-react";
import type { Artist, ArtistRole } from "@/types/music";

const ROLE_BADGE: Record<ArtistRole, string> = {
  primary: "Primary Artist",
  featured: "Featured Artist",
  producer: "Producer",
  songwriter: "Songwriter",
  engineer: "Engineer",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function SpotifyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.624.624 0 0 1-.86.207c-2.357-1.44-5.323-1.767-8.815-.969a.624.624 0 1 1-.277-1.217c3.821-.872 7.099-.494 9.745 1.123a.624.624 0 0 1 .207.856zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.696-1.658-6.81-2.138-9.997-1.169a.78.78 0 1 1-.455-1.494c3.642-1.105 8.176-.568 11.27 1.334a.78.78 0 0 1 .254 1.072zm.106-2.835c-3.234-1.92-8.57-2.097-11.657-1.16a.936.936 0 1 1-.546-1.79c3.539-1.075 9.428-.866 13.144 1.34a.936.936 0 1 1-.94 1.61z" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type LinkSpec = {
  href: string;
  label: string;
  hoverColor: string;
  icon: React.ReactNode;
};

export function ArtistHero({ artist }: { artist: Artist }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bio = artist.bio?.trim() ?? "";
  const bioLines = bio.split("\n").length;
  const bioLong = bioLines > 3 || bio.length > 240;

  const links: LinkSpec[] = [
    artist.spotifyUrl && {
      href: artist.spotifyUrl,
      label: "Spotify",
      hoverColor: "#1DB954",
      icon: <SpotifyIcon />,
    },
    artist.appleMusicUrl && {
      href: artist.appleMusicUrl,
      label: "Apple Music",
      hoverColor: "#FC3C44",
      icon: <Apple size={16} />,
    },
    artist.youtubeUrl && {
      href: artist.youtubeUrl,
      label: "YouTube",
      hoverColor: "#FF0000",
      icon: <YoutubeIcon />,
    },
    artist.instagramUrl && {
      href: artist.instagramUrl,
      label: "Instagram",
      hoverColor: "#E4405F",
      icon: <InstagramIcon />,
    },
    artist.twitterUrl && {
      href: artist.twitterUrl,
      label: "Twitter",
      hoverColor: "#1DA1F2",
      icon: <TwitterIcon />,
    },
    artist.websiteUrl && {
      href: artist.websiteUrl,
      label: "Website",
      hoverColor: "#62f3e4",
      icon: <Globe size={16} />,
    },
  ].filter(Boolean) as LinkSpec[];

  return (
    <section>
      <div
        className="relative h-[180px] w-full md:h-[300px]"
        style={
          artist.bannerImage
            ? undefined
            : {
                background:
                  "linear-gradient(135deg, #393838 0%, #2a2929 100%)",
              }
        }
      >
        {artist.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.bannerImage}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              "linear-gradient(to top, rgba(57,56,56,1) 0%, rgba(57,56,56,0) 100%)",
          }}
        />
      </div>

      <div className="-mt-[75px] flex flex-col items-start gap-4 px-4 md:flex-row md:items-end md:gap-6 md:px-8">
        <div
          className="flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#393838] bg-[#222121] font-mono text-4xl font-bold text-[#62f3e4] md:h-[150px] md:w-[150px] md:text-5xl"
          aria-hidden
        >
          {artist.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.profileImage}
              alt={artist.name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(artist.name)
          )}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
            {ROLE_BADGE[artist.role] ?? "Featured Artist"}
          </span>
          <h1 className="mt-2 font-[family-name:var(--font-bungee)] text-3xl tracking-tight text-[#dde4e2] md:text-5xl">
            {artist.name}
          </h1>
          {artist.location ? (
            <p className="mt-1 text-xs text-[#B3B3B3]">{artist.location}</p>
          ) : null}
        </div>
      </div>

      {bio ? (
        <div className="px-4 pt-5 md:px-8">
          <p
            className={`max-w-3xl whitespace-pre-line text-sm leading-relaxed text-white/85 ${
              bioLong && !bioExpanded ? "line-clamp-3" : ""
            }`}
          >
            {bio}
          </p>
          {bioLong ? (
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-[#62f3e4] hover:brightness-110"
            >
              {bioExpanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 md:px-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="ntv-artist-social flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition-colors hover:text-white"
              style={
                { ["--hover-color" as string]: link.hoverColor } as React.CSSProperties
              }
            >
              {link.icon}
            </a>
          ))}
          <style jsx>{`
            .ntv-artist-social:hover {
              border-color: var(--hover-color);
              color: var(--hover-color);
            }
          `}</style>
        </div>
      ) : null}
    </section>
  );
}
