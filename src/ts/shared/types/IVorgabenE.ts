import type duration from 'dayjs/plugin/duration.js';

export interface IVorgabenE {
  rZ: duration.Duration;
  fZ: {
    [key: string]: duration.Duration;
  };
}
