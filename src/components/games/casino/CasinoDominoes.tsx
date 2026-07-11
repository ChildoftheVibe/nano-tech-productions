"use client";

import { useCallback, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";
import { DominoTable, type TileVisual } from "./dominoes/DominoTable";
import {
  bestConnectionIndex,
  DEFAULT_RULESET,
  doublesOutcome,
  fullSet,
  mainPayoutMultiplier,
  mainPoints,
  shuffle,
  type Domino,
} from "@/lib/casino/dominoes";

/** Casino Dominoes: a 3-tile hand vs. a fresh community tile, over two
 *  betting rounds. Main bet pays on the best hand↔community pip connection
 *  (must sum to a multiple of 5); the doubles side bet pays on how many
 *  doubles show up between your hand and that round's community tile. */

type RoundResult = {
  community: Domino;
  points: number;
  mainMult: number;
  doublesLabel: string;
  doublesMult: number;
  mainWon: number;
  doublesWon: number;
  bestIndex: number;
};

const LABELS: Record<string, string> = {
  MAIDENS_HAND: "Maiden's Hand!",
  DOUBLE_DOUBLES: "Double Doubles!",
  FOUR_DOUBLES: "Four Doubles!",
  THREE_DOUBLES: "Three Doubles",
  TWO_DOUBLES: "Two Doubles",
  NONE: "No doubles",
};

type Stage = "bet1" | "result1" | "bet2" | "result2";

function score(hand: Domino[], community: Domino, mainBet: number, doublesBet: number): RoundResult {
  const points = mainPoints(hand, community);
  const mainMult = mainPayoutMultiplier(points, DEFAULT_RULESET.mainPayouts);
  const doublesLabel = doublesOutcome(hand, community);
  const doublesMult = DEFAULT_RULESET.doublesPayouts[doublesLabel] ?? 0;
  return {
    community,
    points,
    mainMult,
    doublesLabel,
    doublesMult,
    mainWon: mainBet * mainMult,
    doublesWon: doublesBet * doublesMult,
    bestIndex: bestConnectionIndex(hand, community),
  };
}

export function CasinoDominoes() {
  const round = useCasinoRound("dominoes", DEFAULT_RULESET.minMainBet);
  const reducedMotion = !!useReducedMotion();

  const [stage, setStage] = useState<Stage>("bet1");
  const [hand, setHand] = useState<Domino[]>([]);
  const boneyard = useRef<Domino[]>([]);
  const [doublesBet1, setDoublesBet1] = useState(0);
  const [mainBet2, setMainBet2] = useState(DEFAULT_RULESET.minMainBet);
  const [doublesBet2, setDoublesBet2] = useState(0);
  const [result1, setResult1] = useState<RoundResult | null>(null);
  const [result2, setResult2] = useState<RoundResult | null>(null);
  const [totalWagered, setTotalWagered] = useState(0);

  const dealRound1 = useCallback(async () => {
    const mainBet1 = round.stake;
    const stake1 = mainBet1 + doublesBet1;
    round.setStake(stake1);
    if (!(await round.begin())) return;
    const deck = shuffle(fullSet());
    const h = deck.slice(0, DEFAULT_RULESET.cardsPerHand);
    const community = deck[DEFAULT_RULESET.cardsPerHand];
    boneyard.current = deck.slice(DEFAULT_RULESET.cardsPerHand + 1);
    setHand(h);
    setTotalWagered(stake1);
    setResult1(score(h, community, mainBet1, doublesBet1));
    setMainBet2(mainBet1);
    setDoublesBet2(doublesBet1);
    setStage("result1");
  }, [round, doublesBet1]);

  const dealRound2 = useCallback(async () => {
    const stake2 = mainBet2 + doublesBet2;
    if (!(await round.raise(stake2))) return;
    const community = boneyard.current[0];
    boneyard.current = boneyard.current.slice(1);
    const r2 = score(hand, community, mainBet2, doublesBet2);
    setResult2(r2);
    setTotalWagered((t) => t + stake2);
    setStage("result2");
    const r1 = result1!;
    void round.finish(r1.mainWon + r1.doublesWon + r2.mainWon + r2.doublesWon, {
      round1: r1,
      round2: r2,
    });
  }, [round, mainBet2, doublesBet2, hand, result1]);

  const playAgain = useCallback(() => {
    round.reset();
    setStage("bet1");
    setHand([]);
    setResult1(null);
    setResult2(null);
    setDoublesBet1(0);
    setTotalWagered(0);
    boneyard.current = [];
  }, [round]);

  const activeResult = stage === "result2" ? result2 : result1;
  const handVisuals: TileVisual[] = hand.map((domino, i) => ({
    domino,
    glow: !!activeResult && activeResult.bestIndex === i,
  }));
  const communityVisual: TileVisual | null = activeResult
    ? { domino: activeResult.community, glow: activeResult.mainMult > 0 }
    : null;

  return (
    <GameShell
      title="Casino Dominoes"
      tagline="Main bet on the connection · side bet on doubles · two rounds"
      art={GAME_ART["dominoes"]}
    >
      <div className="flex flex-col items-center gap-5">
        {hand.length > 0 && (
          <DominoTable hand={handVisuals} community={communityVisual} reducedMotion={reducedMotion} />
        )}

        {round.phase === "idle" && stage === "bet1" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">Main bet</p>
              <StakeControls
                stake={round.stake}
                setStake={round.setStake}
                min={DEFAULT_RULESET.minMainBet}
                max={DEFAULT_RULESET.maxMainBet}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">Doubles side bet</p>
              <StakeControls
                stake={doublesBet1}
                setStake={setDoublesBet1}
                min={DEFAULT_RULESET.minDoublesBet}
                max={DEFAULT_RULESET.maxDoublesBet}
              />
            </div>
            <TableButton onClick={dealRound1}>Deal Round 1</TableButton>
          </div>
        )}

        {stage === "result1" && result1 && (
          <>
            <RoundSummary label="Round 1" result={result1} />
            <TableButton onClick={() => setStage("bet2")}>Continue to Round 2</TableButton>
          </>
        )}

        {stage === "bet2" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">Round 2 main bet</p>
              <StakeControls
                stake={mainBet2}
                setStake={setMainBet2}
                min={DEFAULT_RULESET.minMainBet}
                max={DEFAULT_RULESET.maxMainBet}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">Round 2 doubles bet</p>
              <StakeControls
                stake={doublesBet2}
                setStake={setDoublesBet2}
                min={DEFAULT_RULESET.minDoublesBet}
                max={DEFAULT_RULESET.maxDoublesBet}
              />
            </div>
            <TableButton onClick={dealRound2}>Deal Round 2</TableButton>
          </div>
        )}

        {stage === "result2" && result2 && <RoundSummary label="Round 2" result={result2} />}

        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={totalWagered} onNext={playAgain} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}

function RoundSummary({ label, result }: { label: string; result: RoundResult }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0d1a17] px-4 py-3 text-center">
      <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">{label}</p>
      <p className="text-sm text-[#dde4e2]">
        Connection: <span className="font-bold text-[#62f3e4]">{result.points || "no score"}</span>
        {result.mainMult > 0 && <span className="text-[#62f3e4]"> · pays {result.mainMult}×</span>}
      </p>
      <p className="text-xs text-[#bbcac6]">
        {LABELS[result.doublesLabel]}
        {result.doublesMult > 0 && <span className="text-[#ffabef]"> · pays {result.doublesMult}×</span>}
      </p>
    </div>
  );
}
