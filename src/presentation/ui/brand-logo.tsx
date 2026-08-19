"use client";

import Image from "next/image";
import { useTheme } from "@/presentation/hooks/use-ui-preference";

/**
 * The Coin Secret wordmark and mark.
 *
 * Both files are raster art wrapped in SVG, so they cannot be recoloured with
 * CSS. `unoptimized` keeps them out of the image optimizer, which refuses SVG
 * unless the whole app opts into serving arbitrary SVG.
 */
export const BRAND_NAME = "Coin Secret";

/**
 * The wordmark ships in two files because its lettering is white pixels, not
 * text: on a light background the name would simply disappear and leave the
 * mark floating on its own. The light file carries the same glyphs re-inked
 * dark, with the blue mark untouched.
 */
const LOCKUP_SRC = {
  dark: "/logo/logo-text.svg",
  light: "/logo/logo-text-light.png",
} as const;

const LOCKUP_RATIO = 4.4;

export function BrandLockup({ height = 30, className = "" }: { height?: number; className?: string }) {
  const { theme } = useTheme();
  return (
    <Image
      src={LOCKUP_SRC[theme]}
      alt={BRAND_NAME}
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      priority
      unoptimized
      className={className}
    />
  );
}

/** The mark alone. Saturated blue, so it reads on either background. */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo/mark.svg"
      alt={BRAND_NAME}
      width={size}
      height={size}
      priority
      unoptimized
      className={className}
    />
  );
}
