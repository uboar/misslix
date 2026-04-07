import dataByGroup from 'unicode-emoji-json/data-by-group.json';

export interface UnicodeEmojiEntry {
  emoji: string;
  name: string;
  slug: string;
}

export interface UnicodeEmojiGroup {
  name: string;
  slug: string;
  icon: string;
  emojis: UnicodeEmojiEntry[];
}

const GROUP_ICONS: Record<string, string> = {
  'Smileys & Emotion': '😀',
  'People & Body': '👋',
  'Animals & Nature': '🐶',
  'Food & Drink': '🍕',
  'Travel & Places': '✈️',
  'Activities': '⚽',
  'Objects': '💡',
  'Symbols': '❤️',
  'Flags': '🏁',
};

const GROUP_LABELS: Record<string, string> = {
  'Smileys & Emotion': '顔・感情',
  'People & Body': '人物',
  'Animals & Nature': '動物・自然',
  'Food & Drink': '食べ物',
  'Travel & Places': '旅行・場所',
  'Activities': '活動',
  'Objects': 'モノ',
  'Symbols': '記号',
  'Flags': '旗',
};

interface RawEmojiGroup {
  name: string;
  slug: string;
  emojis: Array<{
    emoji: string;
    name: string;
    slug: string;
    skin_tone_support: boolean;
  }>;
}

export const unicodeEmojiGroups: UnicodeEmojiGroup[] = (dataByGroup as RawEmojiGroup[]).map((g) => ({
  name: g.name,
  slug: g.slug,
  icon: GROUP_ICONS[g.name] ?? g.emojis[0]?.emoji ?? '?',
  label: GROUP_LABELS[g.name] ?? g.name,
  emojis: g.emojis.map((e) => ({
    emoji: e.emoji,
    name: e.name,
    slug: e.slug,
  })),
}));

/** 全Unicode絵文字のフラットリスト (検索用) */
export const allUnicodeEmojis: UnicodeEmojiEntry[] = unicodeEmojiGroups.flatMap((g) => g.emojis);
