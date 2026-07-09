"use client";

import { useCallback, useState } from "react";
import { GameShell, PlayingCard, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";
import { bjValue, shuffledDeck, type Card } from "../engine/cards";

/** Blackjack: dealer stands on 17, blackjack pays 3:2, double-down allowed. */
export function Blackjack() {
  const round = useCasinoRound("blackjack", 10);
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [canAct, setCanAct] = useState(false);

  const deal = useCallback(async () => {
    if (!(await round.begin())) return;
    const d = shuffledDeck();
    setPlayer([d[0], d[2]]);
    setDealer([d[1], d[3]]);
    setDeck(d.slice(4));
    setRevealed(false);
    setDoubled(false);
    const pv = bjValue([d[0], d[2]]).total;
    const dv = bjValue([d[1], d[3]]).total;
    if (pv === 21 || dv === 21) {
      // Instant blackjack resolution.
      setRevealed(true);
      setCanAct(false);
      const payout =
        pv === 21 && dv === 21 ? round.stake
        : pv === 21 ? Math.floor(round.stake * 2.5)
        : 0;
      void round.finish(payout, { pv, dv, blackjack: true });
    } else {
      setCanAct(true);
    }
  }, [round]);

  const settle = useCallback(
    (finalPlayer: Card[], stakeMult: number) => {
      // Dealer draws to 17+.
      const d = [...dealer];
      let rest = [...deck];
      while (bjValue(d).total < 17) {
        d.push(rest[0]);
        rest = rest.slice(1);
      }
      setDealer(d);
      setDeck(rest);
      setRevealed(true);
      setCanAct(false);
      const pv = bjValue(finalPlayer).total;
      const dv = bjValue(d).total;
      const unit = round.stake * stakeMult;
      let payout = 0;
      if (pv <= 21) {
        if (dv > 21 || pv > dv) payout = unit * 2;
        else if (pv === dv) payout = unit;
      }
      void round.finish(payout, { pv, dv, doubled: stakeMult > 1 });
    },
    [dealer, deck, round],
  );

  const hit = useCallback(() => {
    const next = [...player, deck[0]];
    setPlayer(next);
    setDeck(deck.slice(1));
    if (bjValue(next).total > 21) {
      setRevealed(true);
      setCanAct(false);
      void round.finish(0, { pv: bjValue(next).total, busted: true });
    }
  }, [player, deck, round]);

  const stand = useCallback(() => settle(player, doubled ? 2 : 1), [settle, player, doubled]);

  const doubleDown = useCallback(async () => {
    if (!(await round.raise(round.stake))) return;
    setDoubled(true);
    const next = [...player, deck[0]];
    setPlayer(next);
    setDeck(deck.slice(1));
    if (bjValue(next).total > 21) {
      setRevealed(true);
      setCanAct(false);
      void round.finish(0, { pv: bjValue(next).total, busted: true, doubled: true });
    } else {
      settle(next, 2);
    }
  }, [round, player, deck, settle]);

  const playing = round.phase === "playing" && canAct;
  const pv = player.length ? bjValue(player).total : null;
  const dv = dealer.length ? bjValue(revealed ? dealer : [dealer[0]]).total : null;

  return (
    <GameShell title="Blackjack" tagline="Dealer stands on 17 · blackjack pays 3:2" art={GAME_ART["blackjack"]}>
      <div className="flex flex-col items-center gap-5">
        {dealer.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">
              Dealer {dv !== null ? `· ${dv}${revealed ? "" : "+"}` : ""}
            </p>
            <div className="flex gap-2">
              {dealer.map((c, i) => (
                <PlayingCard key={i} card={c} hidden={!revealed && i === 1} />
              ))}
            </div>
          </div>
        )}
        {player.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">
              You {pv !== null ? `· ${pv}` : ""} {doubled ? "· doubled" : ""}
            </p>
            <div className="flex gap-2">
              {player.map((c, i) => (
                <PlayingCard key={i} card={c} />
              ))}
            </div>
          </div>
        )}

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={500} />
            <TableButton onClick={deal}>Deal</TableButton>
          </div>
        )}
        {playing && (
          <div className="flex flex-wrap justify-center gap-2">
            <TableButton onClick={hit}>Hit</TableButton>
            <TableButton onClick={stand} variant="outline">Stand</TableButton>
            {player.length === 2 && !doubled && (
              <TableButton onClick={doubleDown} variant="outline">Double</TableButton>
            )}
          </div>
        )}
        {round.phase === "done" && (
          <ResultBanner
            payout={round.lastPayout}
            stake={round.stake * (doubled ? 2 : 1)}
            onNext={round.reset}
          />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
