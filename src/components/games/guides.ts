/** Shared "How to Play" content for every arcade + casino game in the Nano
 *  Tech Games hub. Single source of truth consumed by both the desktop
 *  panels and the mobile sheet (see HowToPlay.tsx) so the copy never drifts
 *  between breakpoints. Keys must match ARCADE_COMPONENTS / CASINO_COMPONENTS
 *  ids exactly. */

export type GameGuide = {
  /** One-line "how you win". */
  objective: string;
  /** Ordered steps describing a full round. */
  howToPlay: string[];
  /** Arcade only: keyboard + on-screen pad mapping. */
  controls?: { keys: string; action: string }[];
  /** Strategy, odds, payouts, house rules. */
  tips: string[];
};

export const GAME_GUIDES: Record<string, GameGuide> = {
  // ─────────────────────────── Arcade ───────────────────────────
  checkers: {
    objective: "Capture every AI piece, or trap it so it has no legal move left.",
    howToPlay: [
      "Tap one of your teal pieces to select it. Legal destination squares light up pink.",
      "Tap a highlighted square to move. Landing on a diagonal jump over an adjacent enemy piece captures it.",
      "Reaching the far row crowns a piece king (♛), which can then move and capture in both directions.",
      "The vault AI replies after your move. Keep trading until it has no pieces or no legal moves.",
    ],
    controls: [
      { keys: "Tap / click", action: "Select a piece, then tap a lit square to move" },
    ],
    tips: [
      "Only single jumps are in play. There's no forced multi-jump chain, so plan one capture at a time.",
      "The vault AI only takes an available capture about a third of the time, and never plans ahead. Force trades to press your advantage.",
      "Kinging a back-row piece early opens up two-directional captures that the AI struggles to defend against.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },
  tetra: {
    objective: "Clear 4 lines before the stack tops out.",
    howToPlay: [
      "A tetromino falls from the top of a 10-wide well. Move and rotate it to fit the stack.",
      "Filling an entire horizontal row clears that row and scores toward your target.",
      "The drop speed ramps up slightly as you clear more lines.",
      "Reach 4 cleared lines to win; if a piece can't spawn because the stack reached the top, it's over.",
    ],
    controls: [
      { keys: "◀ / ▶ (arrows or on-screen pad)", action: "Shift the piece left/right" },
      { keys: "▲ (arrow or ⟳ pad button)", action: "Rotate the piece" },
      { keys: "▼ (arrow)", action: "Soft-drop one row" },
      { keys: "Space (or ▼ pad button)", action: "Hard-drop instantly" },
    ],
    tips: [
      "Only 4 lines are needed to win: build flat and clear early rather than stacking tall.",
      "Hard-dropping (Space) is the fastest way to bank a placement once you're happy with the position.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },
  "vault-runner": {
    objective: "Run to the portal flag at the end of the stage without falling in a gap or hitting a spike.",
    howToPlay: [
      "Your runner accelerates in the direction you hold and decelerates when you let go.",
      "Time jumps to clear gaps in the ground and hop over spike clusters.",
      "Falling through a gap or hitting a spike ends the run immediately.",
      "Touching the pink portal flag at the finish line wins the run.",
    ],
    controls: [
      { keys: "◀ / ▶ (arrows or hold-buttons)", action: "Move left / right" },
      { keys: "▲ / Space (arrow or jump pad)", action: "Jump" },
    ],
    tips: [
      "Obstacles are spaced generously. There's no need to sprint blind; time your jumps off the terrain edge.",
      "Landing softens your momentum, so start slowing down before a gap you plan to jump.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },
  "star-vanguard": {
    objective: "Shoot down the entire alien formation before it reaches your ship.",
    howToPlay: [
      "Strafe left and right to line up under an alien, then fire straight up.",
      "The formation sweeps side to side and steps closer to you each time it hits the edge.",
      "Aliens occasionally fire back, so dodge their shots.",
      "Clear every alien to win; getting hit or letting the formation land ends the run.",
    ],
    controls: [
      { keys: "◀ / ▶ (arrows or hold-buttons)", action: "Strafe left / right" },
      { keys: "Space (or ✦ pad button)", action: "Fire" },
    ],
    tips: [
      "The formation speeds up as fewer aliens remain, so don't waste early shots.",
      "Enemy fire is infrequent early on: press the attack before the formation closes in.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },
  minesweeper: {
    objective: "Open every safe square on the board without detonating one of the 6 hidden mines.",
    howToPlay: [
      "Tap a square to open it. A number shows how many mines are in its 8 neighboring squares.",
      "A square with 0 adjacent mines auto-opens its neighbors (flood fill).",
      "Switch to flag mode to mark squares you believe hide a mine (right-click also flags on desktop).",
      "Open every non-mine square to win; opening a mine ends the round instantly.",
    ],
    controls: [
      { keys: "Tap / click", action: "Open a square (or toggle a flag if Flagging mode is on)" },
      { keys: "Right-click", action: "Toggle a flag without switching modes (desktop)" },
    ],
    tips: [
      "The very first square you open is always guaranteed mine-free along with its neighbors, so open confidently.",
      "The board is a small 7×7 with only 6 mines, well below classic density, so fewer squares require a pure guess.",
      "Use numbers to deduce mine locations logically before flagging or opening nearby squares.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },
  "tank-wars": {
    objective: "Land a shell on the enemy tank before it lands one on you.",
    howToPlay: [
      "Set your barrel angle and shot power with the sliders.",
      "Account for the wind readout at the top of the screen: it pushes shells sideways in flight.",
      "Fire; if you miss, the enemy tank takes its shot back at you with slowly improving accuracy.",
      "Whoever lands a direct hit first wins the duel.",
    ],
    controls: [
      { keys: "Angle slider", action: "Set the barrel elevation (15°-85°)" },
      { keys: "Power slider", action: "Set shot power (30-95)" },
      { keys: "Fire button", action: "Launch the shell on your turn" },
    ],
    tips: [
      "The enemy starts with a wide aiming error that only sharpens gradually after each of its misses. Early shots from it are rarely accurate.",
      "Wind reroll after every shot, so re-check the readout before each attempt rather than reusing your last angle/power.",
      "Higher power with a mid-range angle covers more distance; steeper angles are better for closing gaps in the terrain.",
      "Free to play: win 25 NB, or 5 NB just for finishing the game (daily cap applies).",
    ],
  },

  // ─────────────────────────── Casino ───────────────────────────
  blackjack: {
    objective: "Beat the dealer's hand without going over 21.",
    howToPlay: [
      "Set your bet, then hit Deal — you and the dealer each get two cards (one dealer card stays face down).",
      "Hit to take another card, or Stand to hold your total.",
      "With your first two cards you may Double: your bet doubles, you take exactly one more card, then stand automatically.",
      "The dealer reveals its hidden card and draws until it reaches 17 or busts.",
    ],
    tips: [
      "A two-card 21 is a natural blackjack and pays 3:2 instantly — 2.5× your stake back.",
      "The dealer stands on any 17 or higher, so a hand of 17+ is usually safe to stand on.",
      "Doubling is only offered on your first two cards; use it when you're confident one more card gets you ahead.",
      "Busting over 21 loses your stake immediately, even if the dealer later busts too.",
    ],
  },
  roulette: {
    objective: "Predict where the ball lands on the single-zero European wheel.",
    howToPlay: [
      "Pick a chip value, then click any bet on the table — straight-up numbers, red/black, odd/even, dozens, columns, or high/low.",
      "Stack multiple bets up to the 250 NB table limit; use Undo to remove your last chip or Clear to wipe the board.",
      "Hit Spin to lock in bets and set the wheel and ball in motion.",
      "Every covered bet on the winning number pays out; everything else loses.",
    ],
    tips: [
      "Straight-up (a single number) pays 35:1 plus your stake back — the biggest single-number payout on the table.",
      "Dozens and columns pay 2:1 plus stake; red/black, odd/even, and high/low pay even money (1:1 plus stake).",
      "Zero (0) is not covered by red/black, odd/even, or high/low — only a straight-up bet on 0 wins when it lands.",
      "Spreading chips across several outside bets lowers variance; concentrating on straight-up numbers raises it.",
    ],
  },
  craps: {
    objective: "Win the pass line: roll a natural on the come-out, or hit your point before a 7.",
    howToPlay: [
      "Set your bet and place your pass-line bet to start the come-out roll.",
      "Roll the dice. A 7 or 11 on the come-out wins immediately; a 2, 3, or 12 ('craps') loses immediately.",
      "Any other total (4, 5, 6, 8, 9, or 10) becomes 'the point' — keep rolling.",
      "Roll the point again before a 7 comes up to win; rolling a 7 first ('seven out') loses.",
    ],
    tips: [
      "Pass-line bets pay even money (1:1 plus your stake back) whether you win on the come-out or by hitting the point.",
      "Once a point is set, only that number or a 7 ends the round — every other roll just continues play.",
      "This is pass-line only; there's no odds bet or don't-pass side here, keeping the math simple.",
    ],
  },
  holdem: {
    objective: "Beat the house's best five-card hand using your hole cards plus the shared board.",
    howToPlay: [
      "Ante up and hit Deal — you get 2 hole cards, the house gets 2 hidden cards, and a 5-card board is dealt face down.",
      "Call (matching your ante) to reveal the house's cards and the full board, or Fold to give up.",
      "Best five-card hand from your 2 + the 5-card board beats the house's 2 + board.",
      "Folding forfeits your ante with no showdown.",
    ],
    tips: [
      "Winning after a call pays 2× the total wagered (ante + call); a tie pushes and returns your wager.",
      "Folding always loses the ante, so only fold hands you're sure are behind before seeing the board.",
      "There's no live betting round beyond the single call — this is a fast heads-up format, not multi-street hold'em.",
    ],
  },
  slots: {
    objective: "Land three matching symbols across the reels — three portals (🌀) pay the biggest jackpot.",
    howToPlay: [
      "Set your stake and hit Spin. All three reels spin and stop left to right.",
      "Three matching symbols across all reels pays that symbol's listed multiplier.",
      "Two matching symbols (anywhere among the three) pays a smaller multiplier for symbols that offer one.",
      "The multiplier chart under the reels shows every symbol's 3-of-a-kind payout.",
    ],
    tips: [
      "Three portals (🌀) pay 100× your stake — the top jackpot on the machine.",
      "Rarer symbols (lower spin weight) pay more: 🌀 > 💎 > 🎵 > ⚡ > 🔋 > 🛰️.",
      "Not every symbol pays on a pair — check the chart; 🔋 and 🛰️ only pay on three-of-a-kind.",
    ],
  },
  pokeno: {
    objective: "Cover a full row, column, or diagonal on your 5×5 card within 15 draws.",
    howToPlay: [
      "Deal the board — 25 unique cards laid out in a 5×5 grid.",
      "Draw a card from a second shuffled deck; any board card matching that exact card (rank and suit) gets covered.",
      "Keep drawing up to 15 times total.",
      "After the 15th draw, every fully-covered line (5 of 5) scores, and every 4-of-5 line scores a smaller bonus.",
    ],
    tips: [
      "Rows, columns, and both diagonals all count — 12 lines total on the board.",
      "A fully covered line pays 10× your stake each; a line with exactly 4 of 5 covered pays 1× each.",
      "Multiple lines can pay in the same round — total payout multiplier is capped at 25×.",
    ],
  },
  "casino-wild": {
    objective: "Shed all 7 of your cards before the house sheds theirs.",
    howToPlay: [
      "Ante and deal — you and the house each get 7 cards from a color-and-number deck; a top card sets the active color.",
      "Play a card that matches the top card's color or number (wild cards play on anything and let you set the color).",
      "If you have no playable card, draw one from the pile instead of playing.",
      "Skip cards skip the house's next turn; +2 cards force the house to draw two. Empty your hand first to win.",
    ],
    tips: [
      "Winning pays 2× your ante, plus a 0.75× bonus for every card still in the house's hand when you go out — capped at 8× total.",
      "Losing (the house sheds all 7 first) forfeits your ante.",
      "Holding action cards (skip / +2) for when you're close to going out maximizes the house's remaining card count and your bonus.",
    ],
  },
  dominoes: {
    objective: "Be the first to play all 7 of your tiles, or win a blocked game on lowest pip count.",
    howToPlay: [
      "Ante and draw 7 tiles from a shuffled double-six set; the house also draws 7, and the rest sit in the boneyard.",
      "Play a tile from your hand that matches either open end of the line (lead any tile if the line is empty).",
      "If you have no playable tile, draw from the boneyard; if the boneyard is empty too, you pass.",
      "Play continues until someone plays their last tile ('domino') or neither side can move (blocked game).",
    ],
    tips: [
      "Going out first (dominoing) pays 2× your stake.",
      "If the game blocks (nobody can move), the side with the lower total pip count in hand wins and pays 3×; a tie pushes.",
      "Try to unload your highest-pip tiles (doubles and 6s) early in case the game ends up blocked.",
    ],
  },
  "video-poker": {
    objective: "Draw the best 5-card poker hand — Jacks or Better rules, 9/6 pay table.",
    howToPlay: [
      "Set your stake and Deal — you're shown 5 cards.",
      "Tap any cards you want to keep to mark them Held.",
      "Hit Draw — every unheld card is replaced from the deck.",
      "Your final 5-card hand is scored against the pay table below.",
    ],
    tips: [
      "This is 9/6 Jacks or Better — full house pays 9×, flush pays 6×, and a pair only pays if it's jacks or better (J, Q, K, or A).",
      "Royal flush is the top payout at 250×; straight flush pays 50×; four of a kind pays 25×.",
      "A low pair (2s through 10s) scores as no win under Jacks or Better — hold for a pair of jacks or higher instead.",
      "Full pay table: Royal 250× · Straight Flush 50× · Quads 25× · Full House 9× · Flush 6× · Straight 4× · Trips 3× · Two Pair 2× · Jacks-or-better Pair 1×.",
    ],
  },
  "card-flip": {
    objective: "Flip a higher card than the house.",
    howToPlay: [
      "Set your stake and hit Flip.",
      "You and the house each draw one card from a shuffled deck.",
      "Higher rank wins outright; matching ranks push.",
    ],
    tips: [
      "A win pays even money — 2× your stake back.",
      "A tie (push) simply returns your stake, no gain or loss.",
      "It's a single flip with no decisions after the bet — pure 50/50-ish odds against the house's card.",
    ],
  },
  "three-card-monte": {
    objective: "Track the queen through the shuffle and pick her card.",
    howToPlay: [
      "Set your stake and hit Deal — three cards are shown face up with the queen in the center.",
      "Watch closely as the cards shuffle through several swaps.",
      "Once the shuffle stops, pick the slot you believe holds the queen.",
      "Cards flip face up to reveal whether you tracked her correctly.",
    ],
    tips: [
      "A correct pick pays 2.5× your stake — well above the 1-in-3 baseline odds, rewarding sharp tracking.",
      "Focus on one card's position rather than trying to watch all three at once through the swap sequence.",
      "There's no partial credit — pick wrong and the full stake is lost.",
    ],
  },
};
