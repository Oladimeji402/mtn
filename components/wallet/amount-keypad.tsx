"use client";

import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const;

/** Custom on-screen numeric keypad — whole naira only, no decimal key. Wallet funding
 *  doesn't need kobo-level precision from the user, and skipping it avoids the extra
 *  parsing edge cases a "." key would introduce. */
export function AmountKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  function press(key: string) {
    if (!key) return;
    if (key === "backspace") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.replace(/^0+/, "").length >= 7) return; // caps well above MAX_FUNDING_AMOUNT
    onChange(value === "0" ? key : value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key, i) => (
        <button
          key={i}
          type="button"
          disabled={!key}
          onClick={() => press(key)}
          aria-label={key === "backspace" ? "Delete digit" : key ? `Digit ${key}` : undefined}
          className="flex h-14 items-center justify-center rounded-xl text-xl font-medium text-foreground transition-colors enabled:hover:bg-secondary enabled:active:bg-secondary/70 disabled:opacity-0"
        >
          {key === "backspace" ? <Delete className="size-5" /> : key}
        </button>
      ))}
    </div>
  );
}
