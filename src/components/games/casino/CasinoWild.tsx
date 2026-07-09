"use client";

import { useCallback, useMemo, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";

/** Casino Wild — an original color-and-number shedding game with a casino
 *  betting layer: ante to sit, shed all 7 cards before the house. Winning
 *  pays 2×, plus a 0.75× bonus per card still in the house's hand (capped at
 *  8× total). Losing forfeits the ante. */

type WColor = "teal" | "pink" | "gold" | "violet";
type WCard = { color: WColor | "wild"; value: number | "skip" | "draw2" | "wild" };

const COLORS: WColor[] = ["teal", "pink", "gold", "violet"];
const COLOR_HEX: Record<WColor | "wild", string> = {
  teal: "#62f3e4", pink: "#ffabef", gold: "#f0c674", violet: "#b39df3", wild: "#dde4e2",
};

function wildDeck(): WCard[] {
  const deck: WCard[] = [];
  for (const color of COLORS) {
    for (let v = 0; v <= 9; v++) deck.push({ color, value: v }, { color, value: v });
    deck.push({ color, value: "skip" }, { color, value: "draw2" });
  }
  for (let i = 0; i < 4; i++) deck.push({ color: "wild", value: "wild" });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const matches = (card: WCard, top: WCard, activeColor: WColor): boolean =>
  card.color === "wild" || card.color === activeColor || card.value === top.value;

const cardText = (c: WCard) =>
  c.value === "skip" ? "⊘" : c.value === "draw2" ? "+2" : c.value === "wild" ? "★" : String(c.value);

export function CasinoWild() {
  const round = useCasinoRound("casino-wild", 10);
  const [hand, setHand] = useState<WCard[]>([]);
  const [houseCount, setHouseCount] = useState(7);
  const [houseHand, setHouseHand] = useState<WCard[]>([]);
  const [pile, setPile] = useState<WCard[]>([]);
  const [top, setTop] = useState<WCard | null>(null);
  const [activeColor, setActiveColor] = useState<WColor>("teal");
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);

  const start = useCallback(async () => {
    if (!(await round.begin())) return;
    const deck = wildDeck();
    const mine = deck.slice(0, 7);
    const house = deck.slice(7, 14);
    let flip = 14;
    while (deck[flip].color === "wild") flip++;
    setHand(mine);
    setHouseHand(house);
    setHouseCount(house.length);
    setTop(deck[flip]);
    setActiveColor(deck[flip].color as WColor);
    setPile(deck.slice(flip + 1).concat(deck.slice(14, flip)));
    setNote("Your turn — match color or value.");
    setOver(false);
  }, [round]);

  const drawFrom = useCallback(
    (pileCards: WCard[], n: number): [WCard[], WCard[]] => {
      const take = pileCards.slice(0, n);
      let rest = pileCards.slice(n);
      if (rest.length < 4) rest = rest.concat(wildDeck().slice(0, 20));
      return [take, rest];
    },
    [],
  );

  const settleWin = useCallback(
    (finalHouseCount: number) => {
      setOver(true);
      const mult = Math.min(8, 2 + finalHouseCount * 0.75);
      void round.finish(Math.floor(round.stake * mult), { houseLeft: finalHouseCount, mult });
    },
    [round],
  );

  const houseTurn = useCallback(
    function houseTurnFn(
      curTop: WCard,
      curColor: WColor,
      house: WCard[],
      pileCards: WCard[],
      myCount: number,
      skips = 0,
    ) {
      // House AI: play first matching card (prefer action cards when the
      // player is low), else draw one.
      let h = [...house];
      let p = [...pileCards];
      let t = curTop;
      let color = curColor;

      const playable = h.filter((c) => matches(c, t, color));
      let played: WCard | null = null;
      if (playable.length) {
        const actions = playable.filter((c) => typeof c.value !== "number");
        played = (myCount <= 2 && actions.length ? actions : playable)[0];
        h = h.filter((c) => c !== played);
        t = played;
        color = played.color === "wild"
          ? (h.find((c) => c.color !== "wild")?.color as WColor) ?? "teal"
          : played.color;
      } else {
        const [take, rest] = drawFrom(p, 1);
        h = h.concat(take);
        p = rest;
      }

      setHouseHand(h);
      setHouseCount(h.length);
      setTop(t);
      setActiveColor(color);
      setPile(p);

      if (h.length === 0) {
        setOver(true);
        setNote("The house sheds its last card.");
        void round.finish(0, { houseWon: true });
        return;
      }

      if (played && played.value === "draw2") {
        const [take, rest] = drawFrom(p, 2);
        setHand((mine) => mine.concat(take));
        setPile(rest);
        setNote(`House plays +2 — you draw two. ${played ? "" : ""}`);
      } else if (played && played.value === "skip" && skips < 2) {
        setNote("House plays skip — it goes again.");
        window.setTimeout(
          () => houseTurnFn(t, color, h, p, myCount, skips + 1),
          650,
        );
        return;
      } else {
        setNote(played ? `House plays ${cardText(played)}.` : "House draws.");
      }
    },
    [drawFrom, round],
  );

  const play = useCallback(
    (idx: number) => {
      if (over || !top) return;
      const card = hand[idx];
      if (!matches(card, top, activeColor)) return;
      const nextHand = hand.filter((_, i) => i !== idx);
      const nextColor =
        card.color === "wild"
          ? // Auto-pick the color we hold most of.
            (COLORS.map((c) => [c, nextHand.filter((h) => h.color === c).length] as const)
              .sort((a, b) => b[1] - a[1])[0][0])
          : card.color;
      setHand(nextHand);
      setTop(card);
      setActiveColor(nextColor);

      if (nextHand.length === 0) {
        setNote("You shed your last card!");
        settleWin(houseHand.length);
        return;
      }

      let house = houseHand;
      let p = pile;
      if (card.value === "draw2") {
        const [take, rest] = drawFrom(p, 2);
        house = house.concat(take);
        p = rest;
        setHouseHand(house);
        setHouseCount(house.length);
        setPile(rest);
      }
      if (card.value === "skip") {
        setNote("House skipped — go again.");
        return;
      }
      window.setTimeout(
        () => houseTurn(card, nextColor, house, p, nextHand.length),
        650,
      );
    },
    [over, top, hand, activeColor, houseHand, pile, drawFrom, houseTurn, settleWin],
  );

  const drawOne = useCallback(() => {
    if (over || !top) return;
    const [take, rest] = drawFrom(pile, 1);
    const nextHand = hand.concat(take);
    setHand(nextHand);
    setPile(rest);
    setNote("You draw.");
    window.setTimeout(
      () => houseTurn(top, activeColor, houseHand, rest, nextHand.length),
      650,
    );
  }, [over, top, pile, hand, activeColor, houseHand, drawFrom, houseTurn]);

  const canPlay = useMemo(
    () => (top ? hand.some((c) => matches(c, top, activeColor)) : false),
    [hand, top, activeColor],
  );

  return (
    <GameShell title="Casino Wild" tagline="Shed all 7 first · every card the house holds pays a bonus" art={GAME_ART["casino-wild"]}>
      <div className="flex flex-col items-center gap-4">
        {top && (
          <>
            <p className="text-[11px] text-[#bbcac6]">
              House holds <span className="font-bold text-[#ffabef]">{houseCount}</span> cards
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-16 w-11 items-center justify-center rounded-lg border-2 text-lg font-bold"
                style={{ borderColor: COLOR_HEX[activeColor], color: COLOR_HEX[top.color] }}
                aria-label={`Top card ${cardText(top)}, active color ${activeColor}`}
              >
                {cardText(top)}
              </div>
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: COLOR_HEX[activeColor] }}
                aria-hidden="true"
              />
            </div>
            <p className="min-h-4 text-xs text-[#bbcac6]" aria-live="polite">{note}</p>
            {!over && (
              <div className="flex max-w-md flex-wrap justify-center gap-1.5">
                {hand.map((c, i) => {
                  const ok = matches(c, top, activeColor);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => play(i)}
                      disabled={!ok}
                      className={`flex h-14 w-10 items-center justify-center rounded-lg border-2 bg-[#0d1a17] text-base font-bold transition-transform ${
                        ok ? "hover:-translate-y-1" : "opacity-40"
                      }`}
                      style={{ borderColor: COLOR_HEX[c.color], color: COLOR_HEX[c.color] }}
                      aria-label={`${c.color} ${cardText(c)}${ok ? "" : " (unplayable)"}`}
                    >
                      {cardText(c)}
                    </button>
                  );
                })}
              </div>
            )}
            {!over && !canPlay && (
              <TableButton onClick={drawOne} variant="outline">Draw a Card</TableButton>
            )}
          </>
        )}

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={200} />
            <TableButton onClick={start}>Ante &amp; Deal</TableButton>
          </div>
        )}
        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={round.reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
