/**
 * @jest-environment node
 */

jest.mock("@/lib/logger", () => ({ logError: jest.fn() }));

import { embedId3 } from "@/lib/id3";

const AUDIO = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0xaa, 0xbb]);

function readTagSize(buf: Buffer): number {
  return (
    ((buf[6] & 0x7f) << 21) |
    ((buf[7] & 0x7f) << 14) |
    ((buf[8] & 0x7f) << 7) |
    (buf[9] & 0x7f)
  );
}

describe("embedId3", () => {
  it("prepends an ID3v2.3 header with correct synchsafe size", () => {
    const out = embedId3(AUDIO, { title: "Song", artist: "Artist", album: "Album" });
    expect(out.toString("latin1", 0, 3)).toBe("ID3");
    expect(out[3]).toBe(3); // v2.3
    expect(out[4]).toBe(0);
    const size = readTagSize(out);
    expect(out.length).toBe(10 + size + AUDIO.length);
    // audio bytes preserved verbatim after the tag
    expect(out.subarray(10 + size)).toEqual(AUDIO);
  });

  it("includes text and picture frames", () => {
    const image = { mime: "image/jpeg", data: Buffer.from([0x01, 0x02, 0x03]) };
    const out = embedId3(AUDIO, { title: "Song", trackNumber: 4, image });
    const latin1 = out.toString("latin1");
    expect(latin1).toContain("TIT2");
    expect(latin1).toContain("TRCK");
    expect(latin1).toContain("APIC");
    expect(latin1).toContain("image/jpeg");
    // title stored as UTF-16LE with BOM
    expect(out.includes(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Song", "utf16le")]))).toBe(true);
  });

  it("replaces an existing ID3v2 tag instead of stacking a second one", () => {
    const tagged = embedId3(AUDIO, { title: "First" });
    const retagged = embedId3(tagged, { title: "Second" });
    const size = readTagSize(retagged);
    const rest = retagged.subarray(10 + size);
    expect(rest).toEqual(AUDIO);
    expect(retagged.toString("latin1")).not.toContain(
      Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("First", "utf16le")]).toString("latin1"),
    );
  });

  it("returns the input unchanged when there is no metadata", () => {
    expect(embedId3(AUDIO, {})).toEqual(AUDIO);
  });
});
