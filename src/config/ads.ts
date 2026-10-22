/**
 * AdSense configuration. Nothing ad-related is rendered until PUBLIC_ADSENSE_CLIENT is set.
 */
export const ADSENSE_CLIENT: string = (import.meta.env.PUBLIC_ADSENSE_CLIENT ?? '').trim();
export const adsEnabled = ADSENSE_CLIENT.length > 0;

/** Dev/review aid: dashed boxes where ads will go. Never shown once a real client ID is set. */
export const adPlaceholders = !adsEnabled && import.meta.env.PUBLIC_AD_PLACEHOLDERS === 'true';

export type AdPlacement = 'sidebar' | 'belowTool' | 'inContent';

export const AD_SLOT_IDS: Record<AdPlacement, string> = {
  sidebar: (import.meta.env.PUBLIC_ADSENSE_SLOT_SIDEBAR ?? '').trim(),
  belowTool: (import.meta.env.PUBLIC_ADSENSE_SLOT_BELOW_TOOL ?? '').trim(),
  inContent: (import.meta.env.PUBLIC_ADSENSE_SLOT_IN_CONTENT ?? '').trim(),
};

/** Human description used by the placeholder boxes. */
export const AD_LABELS: Record<AdPlacement, string> = {
  sidebar: '300 × 600 · sticky sidebar',
  belowTool: '336 × 280 desktop · 320 × 100 mobile · reserved',
  inContent: 'Responsive in-content · 280 high reserved',
};
