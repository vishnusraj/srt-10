/* ── Cricket game: progression state ────────────────────────────────────────
   Module-level mutable progression — persists across overlay mount/unmount
   within the same browser tab. Reset only on full page reload (no backend
   by design). */

import {
  STARTING_TARGET,
  TARGET_BUMP_MIN,
  TARGET_BUMP_MAX,
  SPEED_BUMP_PER_LEVEL,
} from "./config";

export interface Progression {
  level:      number;
  target:     number;
  speedBonus: number;
}

export const progression: Progression = {
  level:      1,
  target:     STARTING_TARGET,
  speedBonus: 0,
};

export function advanceProgression(): void {
  const bump = TARGET_BUMP_MIN + Math.floor(Math.random() * (TARGET_BUMP_MAX - TARGET_BUMP_MIN + 1));
  progression.level      += 1;
  progression.target     += bump;
  progression.speedBonus += SPEED_BUMP_PER_LEVEL;
}
