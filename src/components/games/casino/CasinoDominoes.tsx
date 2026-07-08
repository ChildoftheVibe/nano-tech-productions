"use client";

import { useCallback, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { useCasinoRound } from "../useCasinoRound";

/** Casino Dominoes: double-six block game vs the house, 7 tiles each.
 *  Going out pays 2×; winning a blocked game on pip count pays 3×. */

type Tile = [number, number];

function boneyard(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push([a, b]);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

const pips = (hand: Tile[]) => hand.reduce((s, [a, b]) => s + a + b, 0);

const PIP = ["", "•", "••", "•••", "••••", "•••••", "••••••"];
const half = (n: number) => (n === 0 ? "·" : PIP[n]);

export function CasinoDominoes() {
  const round = useCasinoRound("dominoes", 10);
  const [hand, setHand] = useState<Tile[]>([]);
  const [house, setHouse] = useState<Tile[]>([]);
  const [line, setLine] = useState<Tile[]>([]);
  const [yard, setYard] = useState<Tile[]>([]);
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);

  const ends = line.length
    ? [line[0][0], line[line.length - 1][1]]
    : null;

  const start = useCallback(async () => {
    if (!(await round.begin())) return;
    const tiles = boneyard();
    setHand(tiles.slice(0, 7));
    setHouse(tiles.slice(7, 14));
    setYard(tiles.slice(14));
    setLine([]);
    setNote("Lead any tile.");
    setOver(false);
  }, [round]);

  const canPlace = useCallback(
    (t: Tile, e: number[] | null): boolean =>
      !e || t.includes(e[0]) || t.includes(e[1]),
    [],
  );

  const place = useCallback((t: Tile, curLine: Tile[]): Tile[] => {
    if (!curLine.length) return [t];
    const left = curLine[0][0];
    const right = curLine[curLine.length - 1][1];
    if (t[0] === right) return [...curLine, t];
    if (t[1] === right) return [...curLine, [t[1], t[0]]];
    if (t[1] === left) return [t, ...curLine];
    return [[t[1], t[0]], ...curLine];
  }, []);

  const settleBlocked = useCallback(
    (mine: Tile[], theirs: Tile[]) => {
      setOver(true);
      const my = pips(mine);
      const th = pips(theirs);
      if (my < th) {
        setNote(`Blocked — you win on pips ${my} vs ${th}.`);
        void round.finish(round.stake * 3, { blocked: true, my, th });
      } else if (my === th) {
        setNote(`Blocked — dead heat at ${my}. Push.`);
        void round.finish(round.stake, { blocked: true, push: true });
      } else {
        setNote(`Blocked — house wins on pips ${th} vs ${my}.`);
        void round.finish(0, { blocked: true, my, th });
      }
    },
    [round],
  );

  const houseTurn = useCallback(
    (curLine: Tile[], houseTiles: Tile[], yardTiles: Tile[], myHand: Tile[]) => {
      let h = [...houseTiles];
      let y = [...yardTiles];
      let l = curLine;
      const e = () => [l[0][0], l[l.length - 1][1]];
      // Draw until playable or yard empty.
      let tile = h.find((t) => canPlace(t, e()));
      while (!tile && y.length) {
        h = [...h, y[0]];
        y = y.slice(1);
        tile = h.find((t) => canPlace(t, e()));
      }
      if (tile) {
        h = h.filter((t) => t !== tile);
        l = place(tile, l);
        setNote(`House plays ${tile[0]}|${tile[1]}.`);
      } else {
        setNote("House is blocked.");
      }
      setHouse(h);
      setLine(l);
      setYard(y);
      if (h.length === 0) {
        setOver(true);
        setNote("House dominoes out.");
        void round.finish(0, { houseOut: true });
        return;
      }
      // If player also has no move and yard is empty → blocked game.
      const playerCan = myHand.some((t) => canPlace(t, [l[0][0], l[l.length - 1][1]]));
      if (!playerCan && y.length === 0 && !tile) {
        settleBlocked(myHand, h);
      }
    },
    [canPlace, place, round, settleBlocked],
  );

  const play = useCallback(
    (idx: number) => {
      if (over) return;
      const t = hand[idx];
      if (!canPlace(t, ends)) return;
      const nextLine = place(t, line);
      const nextHand = hand.filter((_, i) => i !== idx);
      setHand(nextHand);
      setLine(nextLine);
      if (nextHand.length === 0) {
        setOver(true);
        setNote("Domino! You're out.");
        void round.finish(round.stake * 2, { out: true });
        return;
      }
      window.setTimeout(() => houseTurn(nextLine, house, yard, nextHand), 600);
    },
    [over, hand, ends, canPlace, place, line, house, yard, houseTurn, round],
  );

  const draw = useCallback(() => {
    if (over) return;
    if (!yard.length) {
      // Player blocked with an empty boneyard: house plays on, or the game is
      // blocked for both.
      const houseCan = house.some((t) => canPlace(t, ends));
      if (houseCan) {
        setNote("You're blocked — house plays.");
        window.setTimeout(() => houseTurn(line, house, yard, hand), 500);
      } else {
        settleBlocked(hand, house);
      }
      return;
    }
    setHand((h) => [...h, yard[0]]);
    setYard((y) => y.slice(1));
    setNote("You draw from the boneyard.");
  }, [over, yard, house, ends, canPlace, houseTurn, line, hand, settleBlocked]);

  const playable = hand.some((t) => canPlace(t, ends));

  return (
    <GameShell title="Casino Dominoes" tagline="Double-six block · out pays 2× · pip win pays 3×">
      <div className="flex flex-col items-center gap-4">
        {hand.length > 0 && !over && (
          <>
            <p className="text-[11px] text-[#bbcac6]">
              House holds <span className="font-bold text-[#ffabef]">{house.length}</span> · boneyard {yard.length}
            </p>
            <div className="flex max-w-full flex-wrap justify-center gap-1 rounded-lg bg-[#0d1a17] p-2">
              {line.length === 0 && <span className="text-xs text-[#b3b3b3]">table empty</span>}
              {line.map((t, i) => (
                <span
                  key={i}
                  className="rounded border border-[rgba(255,255,255,0.15)] bg-[#f4f1e8] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1a1a1a]"
                >
                  {half(t[0])}|{half(t[1])}
                </span>
              ))}
            </div>
            <p className="min-h-4 text-xs text-[#bbcac6]" aria-live="polite">{note}</p>
            <div className="flex max-w-md flex-wrap justify-center gap-1.5">
              {hand.map((t, i) => {
                const ok = canPlace(t, ends);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => play(i)}
                    disabled={!ok}
                    className={`rounded-lg border-2 bg-[#f4f1e8] px-2 py-2 font-mono text-xs font-bold text-[#1a1a1a] transition-transform ${
                      ok ? "border-[#62f3e4] hover:-translate-y-1" : "border-transparent opacity-40"
                    }`}
                    aria-label={`Tile ${t[0]} ${t[1]}${ok ? "" : " (unplayable)"}`}
                  >
                    {half(t[0])}|{half(t[1])}
                  </button>
                );
              })}
            </div>
            {!playable && (
              <TableButton onClick={draw} variant="outline">
                {yard.length ? "Draw" : "Pass"}
              </TableButton>
            )}
          </>
        )}

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={200} />
            <TableButton onClick={start}>Ante &amp; Draw Tiles</TableButton>
          </div>
        )}
        {round.phase === "done" && (
          <>
            <p className="text-xs text-[#bbcac6]">{note}</p>
            <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={round.reset} />
          </>
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
