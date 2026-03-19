/**
 * dayjs を利用した日付フォーマットユーティリティ
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

dayjs.extend(relativeTime);
dayjs.locale('ja');

/**
 * 相対時間表示 (例: "3分前", "2時間前", "昨日")
 */
export function formatRelativeTime(dateStr: string): string {
  return dayjs(dateStr).fromNow();
}

/**
 * 絶対時間表示 (例: "2024/03/15 14:30")
 */
export function formatAbsoluteTime(dateStr: string): string {
  return dayjs(dateStr).format('YYYY/MM/DD HH:mm');
}

/**
 * 短い相対時間 (タイムライン表示用)
 *
 * - 1分未満: "now" または "Ns" (N秒)
 * - 1時間未満: "Nm" (N分)
 * - 24時間未満: "Nh" (N時間)
 * - 7日未満: "Nd" (N日)
 * - 同年: "M/D" (月/日)
 * - 別年: "YYYY/M/D"
 */
export function formatShortTime(dateStr: string): string {
  const target = dayjs(dateStr);
  const now = dayjs();
  const diffSeconds = now.diff(target, 'second');
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffSeconds < 10) {
    return 'now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  if (target.year() === now.year()) {
    return target.format('M/D');
  }

  return target.format('YYYY/M/D');
}
