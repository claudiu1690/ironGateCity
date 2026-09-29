import type { AssetView } from '@irongate/rules';
import type { CSSProperties } from 'react';

/** ADR 0007: generated files live at /art/<id>-<width>.<format>. */
export function artUrl(id: string, width: number, format: 'avif' | 'webp'): string {
  return `/art/${id}-${width}.${format}`;
}

export interface PictureProps {
  asset: AssetView;
  /** The `sizes` attribute, e.g. "100vw". */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  /** Decorative art gets an empty alt. */
  decorative?: boolean;
  loading?: 'lazy' | 'eager';
}

/** An asset as <picture>: AVIF then WebP srcsets at the generated widths. */
export function Picture({
  asset,
  sizes = '100vw',
  className,
  style,
  decorative,
  loading = 'lazy',
}: PictureProps) {
  const srcSet = (format: 'avif' | 'webp') =>
    asset.widths.map((w) => `${artUrl(asset.id, w, format)} ${w}w`).join(', ');
  const smallest = Math.min(...asset.widths);
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} />
      <img
        src={artUrl(asset.id, smallest, 'webp')}
        alt={decorative ? '' : asset.alt}
        width={asset.width}
        height={asset.height}
        loading={loading}
        decoding="async"
        draggable={false}
        className={className}
        style={style}
      />
    </picture>
  );
}
