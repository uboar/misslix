/**
 * 時刻表示を定期更新するためのリアクティブなティッカー
 *
 * このモジュールをインポートするコンポーネントは `timeTick` を
 * $derived の依存として含めることで、定期的に時刻表示が再計算される。
 */

let tick = $state(0);

if (typeof window !== 'undefined') {
  setInterval(() => {
    tick++;
  }, 30_000); // 30秒ごとに更新
}

/** 現在のティック値 (参照するだけで $derived の再計算をトリガーする) */
export function getTimeTick(): number {
  return tick;
}
