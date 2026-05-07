"use client";

import { createContext, useContext } from "react";

type PlayerContextValue = { ready: boolean };

const PlayerContext = createContext<PlayerContextValue>({ ready: false });

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  return <PlayerContext.Provider value={{ ready: true }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
