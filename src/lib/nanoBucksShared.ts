/** Nano Bucks constants safe to import from client components.
 *  (src/lib/nanoBucks.ts is server-only and re-exports these.) */

/** NB awarded for winning a portal arcade game. */
export const ARCADE_WIN_REWARD = 25;
/** NB awarded for finishing (but not winning) a portal arcade game. */
export const ARCADE_PLAY_REWARD = 5;
/** Max arcade rewards a wallet can earn per UTC day (anti-farm). */
export const ARCADE_DAILY_CAP = 12;
/** One-time signup bonus so new visitors can immediately hit the tables. */
export const SIGNUP_BONUS = 100;
