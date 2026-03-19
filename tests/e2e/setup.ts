/**
 * E2E テスト グローバルセットアップ
 * Vitest globalSetup から呼ばれる
 */

export async function setup() {
  // Docker環境の起動はscripts/test-e2e.shで行う
  // ここではMisskeyサーバーの応答を確認
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch("http://localhost:3333/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        console.log("Misskey server is ready.");
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Misskey server did not become ready in time.");
}

export async function teardown() {
  // Docker環境の停止はscripts/test-e2e.shで行う
}
