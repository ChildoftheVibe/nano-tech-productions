/**
 * Album detail page theming.
 *
 * The album page is normally dark. When an album has `lightMode` enabled (set
 * per-album from the admin manage-album screen), the page renders with a light
 * neutral theme instead. The album's `accentColor` is untouched in both modes —
 * only the structural surfaces, text, and borders swap.
 *
 * `AlbumDetail` and its child `TrackRow` share these tokens so the two-column
 * layout, tracklist, menus, and modals stay visually consistent.
 */
export type AlbumTheme = {
  /** Left column (art + info) background. */
  panelBg: string;
  /** Right column (tracklist) + credits sheet menu background. */
  trackBg: string;
  /** Track-row context menu + modal surface. */
  menuBg: string;
  /** `r,g,b` triple for the blurred-cover ambient scrim (matches panelBg). */
  scrimRgb: string;
  /** Highest-emphasis text (artist name). */
  textStrong: string;
  /** Primary body text (track titles, credit names). */
  textPrimary: string;
  /** Secondary text (description, outline-button labels). */
  textSecondary: string;
  /** Muted mono meta (durations, track numbers, section labels). */
  textMuted: string;
  /** Slightly brighter muted used on the active track's duration. */
  textMutedActive: string;
  /** Subtle divider / hairline border. */
  border: string;
  /** Stronger outline used on outline buttons, pills, and menus. */
  borderStrong: string;
  /** Row / menu-item hover background. */
  hoverBg: string;
  /** Stronger hover background (modal close button). */
  hoverBgStrong: string;
};

const DARK: AlbumTheme = {
  panelBg: "#161d1c",
  trackBg: "#090f0e",
  menuBg: "#1a2120",
  scrimRgb: "22,29,28",
  textStrong: "#ffffff",
  textPrimary: "#dde4e2",
  textSecondary: "#bbcac6",
  textMuted: "#6b7c79",
  textMutedActive: "#9db8b4",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.20)",
  hoverBg: "rgba(255,255,255,0.05)",
  hoverBgStrong: "rgba(255,255,255,0.10)",
};

const LIGHT: AlbumTheme = {
  panelBg: "#eef2f1",
  trackBg: "#f8fbfa",
  menuBg: "#ffffff",
  scrimRgb: "238,242,241",
  textStrong: "#0b1211",
  textPrimary: "#16211f",
  textSecondary: "#3a4744",
  textMuted: "#5f716d",
  textMutedActive: "#43524f",
  border: "rgba(0,0,0,0.10)",
  borderStrong: "rgba(0,0,0,0.22)",
  hoverBg: "rgba(0,0,0,0.05)",
  hoverBgStrong: "rgba(0,0,0,0.09)",
};

export function getAlbumTheme(light: boolean | undefined): AlbumTheme {
  return light ? LIGHT : DARK;
}
