import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatAbsoluteTime, formatShortTime } from './date';

describe('formatRelativeTime', () => {
  it('returns a string ending in "前" for a past date', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(oneHourAgo);
    expect(result).toMatch(/前$/);
  });

  it('returns a relative string for a date 3 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toMatch(/前$/);
  });

  it('returns a non-empty string', () => {
    const date = new Date(Date.now() - 5000).toISOString();
    expect(formatRelativeTime(date)).toBeTruthy();
  });
});

describe('formatAbsoluteTime', () => {
  it('formats date in YYYY/MM/DD HH:mm format', () => {
    const result = formatAbsoluteTime('2024-03-15T14:30:00.000Z');
    // タイムゾーンによって時刻は変わるが、形式はチェックできる
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('formats another date correctly', () => {
    const result = formatAbsoluteTime('2023-12-31T23:59:00.000Z');
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('formats a date with the correct year', () => {
    const result = formatAbsoluteTime('2024-01-01T00:00:00.000Z');
    expect(result).toMatch(/^202[34]/);
  });
});

describe('formatShortTime', () => {
  it('returns "now" for a date less than 10 seconds ago', () => {
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000).toISOString();
    expect(formatShortTime(fiveSecondsAgo)).toBe('now');
  });

  it('returns "now" for the exact boundary of 9 seconds ago', () => {
    const nineSecondsAgo = new Date(Date.now() - 9 * 1000).toISOString();
    expect(formatShortTime(nineSecondsAgo)).toBe('now');
  });

  it('returns Ns format for 10-59 seconds ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatShortTime(thirtySecondsAgo)).toMatch(/^\d+s$/);
  });

  it('returns Nm format for 1-59 minutes ago', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatShortTime(tenMinutesAgo)).toMatch(/^\d+m$/);
  });

  it('returns Nh format for 1-23 hours ago', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatShortTime(fiveHoursAgo)).toMatch(/^\d+h$/);
  });

  it('returns Nd format for 1-6 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatShortTime(threeDaysAgo)).toMatch(/^\d+d$/);
  });

  it('returns M/D format for same year but more than 7 days ago', () => {
    // 現在年の30日前 (ただし年を跨がないように注意)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    // 年が変わった場合はスキップできないので、同じ年の場合のみ検証
    if (thirtyDaysAgo.getFullYear() === now.getFullYear()) {
      const result = formatShortTime(thirtyDaysAgo.toISOString());
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}$/);
    }
  });

  it('returns YYYY/M/D format for a date in a different year', () => {
    const oldDate = '2020-06-15T12:00:00.000Z';
    const result = formatShortTime(oldDate);
    expect(result).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/);
  });

  it('returns correct second count for 30 seconds ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const result = formatShortTime(thirtySecondsAgo);
    // 29s~31sの範囲で許容
    expect(result).toMatch(/^(2[89]|30|31)s$/);
  });
});
