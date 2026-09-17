export const PLAYBACK_SPEEDS = [1, 2, 4, 8] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function nextPlaybackSpeed(speed: PlaybackSpeed): PlaybackSpeed {
  return PLAYBACK_SPEEDS[
    (PLAYBACK_SPEEDS.indexOf(speed) + 1) % PLAYBACK_SPEEDS.length
  ];
}

export function isPlaybackSpeed(value: number): value is PlaybackSpeed {
  return PLAYBACK_SPEEDS.some((speed) => speed === value);
}
