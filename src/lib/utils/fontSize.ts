import type { FontSizePreset } from '$lib/types';

const ROOT_FONT_SIZE_MAP: Record<FontSizePreset, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

export const FONT_SIZE_OPTIONS: ReadonlyArray<{
  value: FontSizePreset;
  label: string;
  size: string;
}> = [
  { value: 'sm', label: '小', size: ROOT_FONT_SIZE_MAP.sm },
  { value: 'md', label: '標準', size: ROOT_FONT_SIZE_MAP.md },
  { value: 'lg', label: '大', size: ROOT_FONT_SIZE_MAP.lg },
  { value: 'xl', label: '特大', size: ROOT_FONT_SIZE_MAP.xl },
];

export function isFontSizePreset(value: string): value is FontSizePreset {
  return value in ROOT_FONT_SIZE_MAP;
}

export function getRootFontSize(value: FontSizePreset): string {
  return ROOT_FONT_SIZE_MAP[value];
}

export function applyRootFontSize(value: FontSizePreset): void {
  document.documentElement.style.fontSize = getRootFontSize(value);
}
