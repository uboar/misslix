import { afterEach, describe, expect, it } from 'vitest';
import { applyRootFontSize, getRootFontSize, isFontSizePreset } from './fontSize';

afterEach(() => {
  document.documentElement.style.fontSize = '';
});

describe('fontSize utils', () => {
  it('accepts known presets only', () => {
    expect(isFontSizePreset('sm')).toBe(true);
    expect(isFontSizePreset('md')).toBe(true);
    expect(isFontSizePreset('giant')).toBe(false);
  });

  it('returns the root font size for a preset', () => {
    expect(getRootFontSize('lg')).toBe('18px');
    expect(getRootFontSize('xl')).toBe('20px');
  });

  it('applies the font size to the document root', () => {
    applyRootFontSize('sm');
    expect(document.documentElement.style.fontSize).toBe('14px');
  });
});
