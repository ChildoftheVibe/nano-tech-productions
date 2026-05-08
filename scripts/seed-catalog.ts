/**
 * One-time seed for the NTV catalog. Run with:
 *
 *   node --env-file=.env.local --experimental-strip-types scripts/seed-catalog.ts
 *
 * Idempotent: each album is matched by slug; existing albums are skipped, and
 * existing tracks for those albums are matched by (album_id, track_number).
 */

import { createClient } from "@supabase/supabase-js";

type SeedTrack = {
  title: string;
  trackNumber: number;
  duration: string;
  price: number;
  features?: string[];
};

type SeedAlbum = {
  slug: string;
  title: string;
  description: string;
  releaseDate: string;
  coverImage: string;
  bgColor: string;
  accentColor: string;
  spotifyUrl: string;
  tracks: SeedTrack[];
};

const ALBUMS: SeedAlbum[] = [
  {
    slug: "nano-tech-green",
    title: "Nano Tech Green",
    description: "Where it all began. The foundation of the Nano Tech sound.",
    releaseDate: "2020-09-04",
    coverImage: "/assets/green/cover.webp",
    bgColor: "#052e16",
    accentColor: "#4ade80",
    spotifyUrl: "https://open.spotify.com/album/1OjMZ7RAz44T1nJ0xiGJrY",
    tracks: [
      { title: "Fall off the Edge", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "Go and Get the Fanto", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Magical Stardust", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Jumping out the Gym", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Mr. Rogers (How You Like It)", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "Just Came for the Vibe", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Unscripted", trackNumber: 7, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "art-of-nano-tech",
    title: "Art of Nano Tech",
    description: "Jhodge exploring and developing the sounds of Nano Tech Vibe Vol. 3.",
    releaseDate: "2020-08-21",
    coverImage: "/assets/art/cover.webp",
    bgColor: "#1c0a00",
    accentColor: "#fbbf24",
    spotifyUrl: "https://open.spotify.com/album/3fTPeicSbU7cnQCbaZxTRp",
    tracks: [
      { title: "Trap Zi", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "Let Me Take You on a Trip", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Take off Your Blindfold", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Dinner Time", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Calculus", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "Tickle My Gift", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Same Mistakes", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "Art of Nano Tech", trackNumber: 8, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-noir",
    title: "Nano Tech Noir",
    description:
      "It is not enough to gain knowledge. One must also apply it. Funk / Chicago House / Disco / Late 90s Underground Hip-Hop / Roots Reggae.",
    releaseDate: "2022-06-03",
    coverImage: "/assets/noir/cover.webp",
    bgColor: "#0a0a0a",
    accentColor: "#525252",
    spotifyUrl: "",
    tracks: [
      { title: "So Much to Unpack", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "Shake it Out", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Ether Shower", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Nano Tech Noir", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Peace With God", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "One Life Left", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Save the Citizen", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "So Broke I Can't Afford to Work", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "Back To My Roots", trackNumber: 9, duration: "3:00", price: 1.0 },
      { title: "Behind the Scenes", trackNumber: 10, duration: "3:00", price: 1.0 },
      { title: "You Laugh I Prey", trackNumber: 11, duration: "3:00", price: 1.0 },
      { title: "Lost in the Metaverse", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "Heal Yourself", trackNumber: 13, duration: "3:00", price: 1.0 },
      { title: "It's Over", trackNumber: 14, duration: "3:00", price: 1.0 },
      { title: "Influences", trackNumber: 15, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-blue",
    title: "Nano Tech Blue",
    description:
      "Jhodge Goes Emo! Retro futuristic sounds and new age drum kits creating an emotional rollercoaster of Exciting Sad Boy Music. This is not your regular everyday average ordinary space odyssey.",
    releaseDate: "2023-06-30",
    coverImage: "/assets/blue/cover.webp",
    bgColor: "#0f172a",
    accentColor: "#60a5fa",
    spotifyUrl: "https://open.spotify.com/album/1PtTnoVJoxqTAcljsjCgHz",
    tracks: [
      { title: "Suga Pie", trackNumber: 1, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "Heavens Gates", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Pretty Face", trackNumber: 3, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "Dreams", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Can't Let the Bad Outweigh the Good", trackNumber: 5, duration: "3:00", price: 1.0, features: ["Negasi Ambesa"] },
      { title: "Gotta Let Go", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Living Life Wild", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "Passive Aggressive", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "Spiraling", trackNumber: 9, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "Whatchu Tryna Prove?", trackNumber: 10, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "Make Move", trackNumber: 11, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "I Ain't Gone Hold You", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "Doin So Good", trackNumber: 13, duration: "3:00", price: 1.0 },
      { title: "I Catch Plays", trackNumber: 14, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
    ],
  },
  {
    slug: "nano-tech-red",
    title: "Nano Tech Red",
    description:
      "Jhodge enters the Red Era. Rock, Rage, Trap, Heavy Hitters. Features Negasi Ambesa and Sun Savior. Album cover features a spiked skull on a red-tinted post-apocalyptic backdrop, hand drawn by Aka.",
    releaseDate: "2023-08-11",
    coverImage: "/assets/red/cover.webp",
    bgColor: "#450a0a",
    accentColor: "#dc2626",
    spotifyUrl: "https://open.spotify.com/album/0rVBfR6PRfCSY0qrnzVYrD",
    tracks: [
      { title: "Home Sweet Home", trackNumber: 1, duration: "3:00", price: 1.0, features: ["Sun Savior"] },
      { title: "Break Me", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "All Night", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Club Rage", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Make Me", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "We Acting", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Ryan", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "Can't Stand", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "White Satin", trackNumber: 9, duration: "3:00", price: 1.0 },
      { title: "My Space", trackNumber: 10, duration: "3:00", price: 1.0, features: ["Negasi Ambesa"] },
      { title: "Roll da Dice", trackNumber: 11, duration: "3:00", price: 1.0, features: ["Child of the Vibe"] },
      { title: "Lost Time", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "Rainforest", trackNumber: 13, duration: "3:00", price: 1.0 },
      { title: "Shame Innit", trackNumber: 14, duration: "3:00", price: 1.0 },
      { title: "Clout Chasing", trackNumber: 15, duration: "3:00", price: 1.0 },
      { title: "They Slept", trackNumber: 16, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-pearl",
    title: "Nano Tech Pearl",
    description:
      "Pre Rock Vibe. Made at the same time as Nano Tech Red. Jhodge's Pearl Era — polishing his vocal chain and drum mix.",
    releaseDate: "2023-07-28",
    coverImage: "/assets/pearl/cover.webp",
    bgColor: "#1a1a1a",
    accentColor: "#d4d4d4",
    spotifyUrl: "https://open.spotify.com/album/3Gm2MdADrGNkuT8fkPiIlN",
    tracks: [
      { title: "Tesla Cyber Truck", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "Burst Ya Bubble", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Can't Let Nobody", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Ain't Finna Wait", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Wit My Team", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "That Classic", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Pearlessant", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "Don't Lie To Me", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "Way 2 Lit", trackNumber: 9, duration: "3:00", price: 1.0 },
      { title: "Nano Tech Pearl", trackNumber: 10, duration: "3:00", price: 1.0 },
      { title: "Fake The Flow", trackNumber: 11, duration: "3:00", price: 1.0 },
      { title: "Is You Real", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "People Ain't Toxic", trackNumber: 13, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-black",
    title: "Nano Tech Black",
    description:
      "Nano Tech Black addresses personal hardships — self growth, relationships, and community. A fade to black without the retirement. Four pillars: Accountability, Communication, Self Awareness, Empathy.",
    releaseDate: "2023-01-01",
    coverImage: "/assets/black/cover.webp",
    bgColor: "#000000",
    accentColor: "#7000ff",
    spotifyUrl: "https://open.spotify.com/album/3ioidCamVr1rli1RspzH0D",
    tracks: [
      { title: "Black Pudding", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "No T.V.", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Black Bidness", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Stomp the Street", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "The Man", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "Good Things Come to Those Who Wait", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Who's Racing", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "Every Night", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "Black Something", trackNumber: 9, duration: "3:00", price: 1.0, features: ["Ras Attitude"] },
      { title: "I Want to Be Inspired", trackNumber: 10, duration: "3:00", price: 1.0 },
      { title: "All We Need Is Love", trackNumber: 11, duration: "3:00", price: 1.0 },
      { title: "Mega Bus", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "Human Nature", trackNumber: 13, duration: "3:00", price: 1.0 },
      { title: "Chicken Shack", trackNumber: 14, duration: "3:00", price: 1.0 },
      { title: "God Knows", trackNumber: 15, duration: "3:00", price: 1.0 },
      { title: "Had to Get Space", trackNumber: 16, duration: "3:00", price: 1.0 },
      { title: "Repeat Mistakes", trackNumber: 17, duration: "3:00", price: 1.0 },
      { title: "Don't Need a Shirt", trackNumber: 18, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-soul",
    title: "Nano Tech Soul",
    description:
      "More than an album — it's a return to the roots, a sonic revisit of Jhodge's origin story. Every beat, lyric, and melody reflects the trials and triumphs that defined his artistic evolution.",
    releaseDate: "2025-02-05",
    coverImage: "/assets/soul/cover.webp",
    bgColor: "#1c0a00",
    accentColor: "#f97316",
    spotifyUrl: "https://open.spotify.com/album/4NAU31bqFUx4MKHNwRQRFa",
    tracks: [
      { title: "Story Told", trackNumber: 1, duration: "3:00", price: 1.0 },
      { title: "Nano Funk", trackNumber: 2, duration: "3:00", price: 1.0 },
      { title: "Peaks and Valleys", trackNumber: 3, duration: "3:00", price: 1.0 },
      { title: "Whatchu Want", trackNumber: 4, duration: "3:00", price: 1.0 },
      { title: "Another Origin Story", trackNumber: 5, duration: "3:00", price: 1.0 },
      { title: "No Disrespect", trackNumber: 6, duration: "3:00", price: 1.0 },
      { title: "Suga", trackNumber: 7, duration: "3:00", price: 1.0 },
      { title: "No More Free Love", trackNumber: 8, duration: "3:00", price: 1.0 },
      { title: "Middle Ground", trackNumber: 9, duration: "3:00", price: 1.0 },
      { title: "Control Divide", trackNumber: 10, duration: "3:00", price: 1.0 },
      { title: "Cold Hearted Game", trackNumber: 11, duration: "3:00", price: 1.0 },
      { title: "Calm Me Down", trackNumber: 12, duration: "3:00", price: 1.0 },
      { title: "Fire", trackNumber: 13, duration: "3:00", price: 1.0 },
      { title: "Whats The Arrangement?", trackNumber: 14, duration: "3:00", price: 1.0 },
    ],
  },
  {
    slug: "nano-tech-purple",
    title: "Nano Tech Purple",
    description: "Royalty. Vision. The Purple Era.",
    releaseDate: "2025-10-29",
    coverImage: "/assets/purple/cover.webp",
    bgColor: "#2e1065",
    accentColor: "#a855f7",
    spotifyUrl: "https://open.spotify.com/album/1iLF1287vnDHLhtn90JrZ3",
    tracks: [],
  },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seed() {
  let albumsInserted = 0;
  let albumsSkipped = 0;
  let tracksInserted = 0;
  let tracksSkipped = 0;

  for (const album of ALBUMS) {
    const { data: existing, error: lookupErr } = await supabase
      .from("albums")
      .select("id")
      .eq("slug", album.slug)
      .maybeSingle();

    if (lookupErr) throw new Error(`lookup ${album.slug}: ${lookupErr.message}`);

    let albumId: string;
    if (existing) {
      albumId = existing.id;
      albumsSkipped++;
      console.log(`= album exists: ${album.slug}`);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("albums")
        .insert({
          slug: album.slug,
          title: album.title,
          description: album.description,
          release_date: album.releaseDate,
          cover_image: album.coverImage,
          background_color: album.bgColor,
          accent_color: album.accentColor,
          spotify_url: album.spotifyUrl || null,
          is_published: true,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        throw new Error(`insert album ${album.slug}: ${insertErr?.message}`);
      }
      albumId = inserted.id;
      albumsInserted++;
      console.log(`+ album inserted: ${album.slug}`);
    }

    if (!album.tracks.length) continue;

    const { data: existingTracks, error: tracksErr } = await supabase
      .from("tracks")
      .select("track_number")
      .eq("album_id", albumId);
    if (tracksErr) throw new Error(`load tracks ${album.slug}: ${tracksErr.message}`);
    const have = new Set((existingTracks ?? []).map((t) => t.track_number));

    const toInsert = album.tracks
      .filter((t) => !have.has(t.trackNumber))
      .map((t) => ({
        album_id: albumId,
        title: t.title,
        track_number: t.trackNumber,
        duration: t.duration,
        price: t.price,
        features: t.features ?? null,
        is_published: true,
      }));

    tracksSkipped += album.tracks.length - toInsert.length;

    if (toInsert.length) {
      const { error: insertTrackErr } = await supabase.from("tracks").insert(toInsert);
      if (insertTrackErr) {
        throw new Error(`insert tracks ${album.slug}: ${insertTrackErr.message}`);
      }
      tracksInserted += toInsert.length;
      console.log(`  + ${toInsert.length} track(s) inserted`);
    }
  }

  console.log("\nDone.");
  console.log(`  albums: ${albumsInserted} inserted, ${albumsSkipped} skipped`);
  console.log(`  tracks: ${tracksInserted} inserted, ${tracksSkipped} skipped`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
