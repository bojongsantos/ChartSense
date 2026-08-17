"use client";

import Image from "next/image";
import { useState } from "react";

export function CoinIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const base = symbol.replace(/USDT$/i, "") || symbol;
  const src = `https://assets.coincap.io/assets/icons/${encodeURIComponent(base.toLowerCase())}@2x.png`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-3 text-[9px] font-extrabold uppercase text-muted"
      style={{ width: size, height: size }}
    >
      {failedSrc === src ? base.slice(0, 2) : (
        <Image
          src={src}
          alt={`${base} logo`}
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}
