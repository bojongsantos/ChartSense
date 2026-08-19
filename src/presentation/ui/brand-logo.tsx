import Image from "next/image";

/**
 * The Coin Secret wordmark and mark.
 *
 * Both files are raster art wrapped in SVG, so they cannot be recoloured with
 * CSS. `unoptimized` keeps them out of the image optimizer, which refuses SVG
 * unless the whole app opts into serving arbitrary SVG.
 */
export const BRAND_NAME = "Coin Secret";

export function BrandLockup({ height = 30, className = "" }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logo/logo-text.svg"
      alt={BRAND_NAME}
      width={Math.round(height * 4.4)}
      height={height}
      priority
      unoptimized
      className={className}
    />
  );
}

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
