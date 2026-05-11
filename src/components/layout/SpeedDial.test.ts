import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SpeedDial from './SpeedDial.svelte';

describe('SpeedDial', () => {
  it('表示中タイムラインの再読み込みを実行する', async () => {
    const onreload = vi.fn();

    render(SpeedDial, { props: { onreload } });

    await fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }));
    await fireEvent.click(screen.getByRole('button', { name: '表示中のタイムラインを再読み込み' }));

    expect(onreload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'メニューを開く' }).getAttribute('aria-expanded')).toBe('false');
  });
});
