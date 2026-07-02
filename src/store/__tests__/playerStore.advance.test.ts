import { usePlayerStore } from "@/store/playerStore";
import type { Album, Track } from "@/types/music";

const mkTrack = (id: string, albumId: string, cover?: string): Track =>
  ({
    id,
    albumId,
    title: `Track ${id}`,
    trackNumber: 1,
    duration: "3:00",
    price: 1,
    audioUrl: `https://x/${id}.mp3`,
    credits: {},
    lyrics: null,
    has_lyrics: false,
    albumCoverImage: cover,
    albumBgColor: cover ? "#111111" : undefined,
    albumAccentColor: cover ? `#ac${albumId}000` : undefined,
    albumSlug: cover ? `slug-${albumId}` : undefined,
    albumTitle: cover ? `Album ${albumId}` : undefined,
  }) as unknown as Track;

describe("playerStore queue advance — album cover/accent sync", () => {
  test("nextTrack swaps currentAlbum for queue tracks with embedded metadata", () => {
    const t1 = mkTrack("1", "A", "coverA.jpg");
    const t2 = mkTrack("2", "B", "coverB.jpg");
    const t3 = mkTrack("3", "C"); // no embedded cover → album left as-is

    usePlayerStore
      .getState()
      .setQueue([t1, t2, t3], t1, { id: "A", accentColor: "#acA000" } as unknown as Album);

    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe("2");
    expect(usePlayerStore.getState().currentAlbum?.id).toBe("B");
    expect(usePlayerStore.getState().currentAlbum?.accentColor).toBe("#acB000");

    // Track without embedded metadata: currentAlbum stays (full-album queues)
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe("3");
    expect(usePlayerStore.getState().currentAlbum?.id).toBe("B");
  });

  test("playTrack prefers explicit album, falls back to embedded metadata", () => {
    const t1 = mkTrack("10", "D", "coverD.jpg");
    usePlayerStore.getState().playTrack(t1);
    expect(usePlayerStore.getState().currentAlbum?.id).toBe("D");
    expect(usePlayerStore.getState().currentAlbum?.accentColor).toBe("#acD000");
  });
});
