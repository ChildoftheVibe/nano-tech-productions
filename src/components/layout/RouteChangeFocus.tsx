"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteChangeFocus() {
  const pathname = usePathname();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const main = document.getElementById("main-content");
    if (main) main.focus();
  }, [pathname]);

  return null;
}
