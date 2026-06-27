"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Mode = "navigate" | "live";

type Props = {
  mode?: Mode;
  // Uncontrolled initial value (used only when `value` is not provided).
  initialQuery?: string;
  // Controlled mode: parent owns the value.
  value?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

const subscribeNoop = () => () => {};
const getClientShortcutFlag = () => true;
const getServerShortcutFlag = () => false;

const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function SearchBar({
  mode = "navigate",
  initialQuery = "",
  value: controlledValue,
  autoFocus = false,
  placeholder = "Search",
  onChange,
  onSubmit,
  className,
  inputClassName,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalValue, setInternalValue] = useState(initialQuery);
  const [focused, setFocused] = useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const showShortcut = useSyncExternalStore(
    subscribeNoop,
    getClientShortcutFlag,
    getServerShortcutFlag,
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // CMD/CTRL + K focuses the bar from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (onSubmit) {
      onSubmit(trimmed);
      return;
    }
    if (mode === "navigate") {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleChange = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (value) {
        e.preventDefault();
        handleChange("");
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className={
        className ??
        "flex h-9 items-center gap-2 rounded-full px-4 py-2 transition-colors duration-150"
      }
      style={{
        background: "#181818",
        border: focused
          ? "1px solid #62f3e4"
          : "1px solid rgba(255,255,255,0.08)",
      }}
      role="search"
    >
      <Search
        size={16}
        className={focused ? "text-[#62f3e4]" : "text-[#B3B3B3]"}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={
          inputClassName ??
          "w-40 bg-transparent text-sm text-white placeholder-[#B3B3B3] outline-none sm:w-56"
        }
        aria-label="Search"
      />
      {showShortcut && !focused && !value ? (
        <kbd
          className="hidden flex-shrink-0 rounded border border-white/15 bg-[#121212]/30 px-1.5 py-0.5 font-mono text-[10px] text-white/50 sm:inline-block"
          aria-hidden="true"
        >
          {isMac() ? "⌘K" : "Ctrl K"}
        </kbd>
      ) : null}
    </form>
  );
}
