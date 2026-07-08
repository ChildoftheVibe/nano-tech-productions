import "server-only";

/** Spotify Web API helpers for the agent platform.
 *
 *  Search uses the client-credentials flow (SPOTIFY_CLIENT_ID/SECRET).
 *  Playlist creation additionally needs a user grant: SPOTIFY_REFRESH_TOKEN
 *  minted once with the `playlist-modify-public` scope (see docs/AGENTS.md).
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

export function isSpotifySearchConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function isSpotifyPlaylistConfigured(): boolean {
  return isSpotifySearchConfigured() && !!process.env.SPOTIFY_REFRESH_TOKEN;
}

const basicAuth = () =>
  Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

async function appToken(): Promise<string | null> {
  if (!isSpotifySearchConfigured()) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basicAuth()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  return ((await res.json()) as { access_token: string }).access_token;
}

async function userToken(): Promise<string | null> {
  if (!isSpotifyPlaylistConfigured()) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basicAuth()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
    }).toString(),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { access_token: string }).access_token;
}

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  url: string;
};

export async function searchTrack(query: string): Promise<SpotifyTrack | null> {
  const token = await appToken();
  if (!token) return null;
  const res = await fetch(
    `${API}/search?type=track&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const t = data.tracks?.items?.[0];
  if (!t) return null;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: (t.artists ?? []).map((a: { name: string }) => a.name),
    url: t.external_urls?.spotify ?? "",
  };
}

export type SpotifyArtist = { id: string; name: string; url: string; genres: string[] };

export async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  const token = await appToken();
  if (!token) return null;
  const res = await fetch(
    `${API}/search?type=artist&limit=1&q=${encodeURIComponent(name)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const a = (await res.json()).artists?.items?.[0];
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    url: a.external_urls?.spotify ?? "",
    genres: a.genres ?? [],
  };
}

/** Create (or return null if unconfigured) a public playlist with the given
 *  track URIs. The description should link listeners back to the platform. */
export async function createPlaylist(
  name: string,
  description: string,
  uris: string[],
): Promise<{ id: string; url: string } | null> {
  const token = await userToken();
  if (!token) return null;
  const meRes = await fetch(`${API}/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) return null;
  const me = await meRes.json();

  const createRes = await fetch(`${API}/users/${me.id}/playlists`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, description, public: true }),
  });
  if (!createRes.ok) return null;
  const playlist = await createRes.json();

  if (uris.length) {
    await fetch(`${API}/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ uris: uris.slice(0, 100) }),
    });
  }
  return { id: playlist.id, url: playlist.external_urls?.spotify ?? "" };
}
