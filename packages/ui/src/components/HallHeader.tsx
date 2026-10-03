import { copy } from '@irongate/content/copy';
import type { AssetView, HallView, ResultArt } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx } from '../format';
import { Picture } from './Picture';

/**
 * Maps v3 (§13.5 rung 3): the 2048 px still is shown at its native width, never upscaled, so a place
 * reads at about the old size on the denser art.
 */
export const MAP_CROP_W = 2048;

export interface MapCropProps {
  /** A map still (any aspect). */
  asset: AssetView;
  /** The point to centre, in fractions of the picture. */
  x: number;
  y: number;
  /**
   * Where the point sits in the box's height (0.5: the middle). Review 3: the hall header puts it at
   * 55 %, so a dome or a tower shows above its front.
   */
  at?: number;
  className?: string;
}

/**
 * A crop of a city's map at a point (the result modal's art header, review 3's hall header): the
 * still at MAP_CROP_W, the point at 50 % of the box's width and `at` of its height. The box is the
 * caller's (`relative overflow-hidden` with a height).
 */
export function MapCrop({ asset, x, y, at = 0.5, className }: MapCropProps) {
  const h = (MAP_CROP_W * asset.height) / asset.width;
  return (
    <Picture
      asset={asset}
      sizes={`${MAP_CROP_W}px`}
      decorative
      className={cx('absolute max-w-none', className)}
      style={{
        width: MAP_CROP_W,
        height: h,
        left: `calc(50% - ${x * MAP_CROP_W}px)`,
        top: `calc(${at * 100}% - ${y * h}px)`,
      }}
    />
  );
}

export interface HallHeaderProps {
  hall: HallView;
  cityName: string;
  /** Night art from 20:00 to 06:00 UTC, the map's rule (GDD §2.2), on the server's clock. */
  night: boolean;
  className?: string;
}

/**
 * Review 3 (GDD §15.3, answers §6.1): the election screens stand on the council's hall. A crop of
 * the city picture at `council.hall`, 150 px on a phone and 180 px from 640 px, the hall at 55 % of
 * the height, an ink gradient over the bottom 45 %, and the caps line *COALPORT COUNCIL · THE TOWN
 * HALL* over it. No stamp, no clouds.
 */
export function HallHeader({ hall, cityName, night, className }: HallHeaderProps) {
  const asset = night ? hall.asset.night : hall.asset.day;
  return (
    <div
      className={cx('relative h-[150px] shrink-0 overflow-hidden bg-ink sm:h-[180px]', className)}
      data-testid="hall-header"
      data-art={asset.id}
    >
      <MapCrop asset={asset} x={hall.x} y={hall.y} at={0.55} className="opacity-85" />
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.9)_0%,rgb(21_24_26/0)_45%)]"
        aria-hidden="true"
      />
      <span className="label-caps absolute bottom-2 left-3 text-[10px] text-dim" data-testid="hall-kicker">
        {copy.hallKicker(cityName, hall.ref)}
      </span>
    </div>
  );
}

export interface ArtPanelProps {
  /** A scene for the place's kind, or the map crop at its pin (the result's ladder, §13.5). */
  art: ResultArt;
  className?: string;
  /** Over the art: the gradient's caption, a stamp, the ground sash. */
  children?: ReactNode;
}

/**
 * The big scene art of a place (the result modal's header, slice 4's place sheet and arrival): the
 * scene cropped to cover the box, or the map crop centred on the pin; the caller sizes the box.
 */
export function ArtPanel({ art, className, children }: ArtPanelProps) {
  return (
    <div className={cx('relative shrink-0 overflow-hidden bg-ink', className)} data-art={art.rung}>
      {art.rung === 'scene' ? (
        <Picture
          asset={art.asset}
          sizes="600px"
          decorative
          className="absolute inset-0 size-full object-cover opacity-85"
        />
      ) : (
        <MapCrop asset={art.asset} x={art.x} y={art.y} className="opacity-80" />
      )}
      {children}
    </div>
  );
}
