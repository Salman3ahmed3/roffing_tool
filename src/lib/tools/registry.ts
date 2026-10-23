import { roofingSpec } from './roofing-tool';
import { fenceSpec } from './fence-tool';
import { deckSpec } from './deck-tool';
import type { ToolSpec } from './types';

export const SPECS = { roofing: roofingSpec, fence: fenceSpec, deck: deckSpec } satisfies Record<string, ToolSpec>;
export type SpecId = keyof typeof SPECS;
