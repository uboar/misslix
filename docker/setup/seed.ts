/**
 * Misskey E2E テストデータ投入スクリプト
 * Docker Misskeyサーバーの初期状態を構築する
 */

const MISSKEY_URL = "http://localhost:3333";

interface TestCredentials {
  admin: { token: string; id: string };
  testUserA: { token: string; id: string; username: string };
  testUserB: { token: string; id: string; username: string };
}

async function api(endpoint: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${MISSKEY_URL}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${endpoint} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function createInitialAdmin() {
  const res = await api("admin/accounts/create", {
    username: "admin",
    password: "admin_password",
  });
  return { token: res.token as string, id: res.id as string };
}

async function createUser(username: string, adminToken: string) {
  const res = await api("admin/accounts/create", {
    username,
    password: `${username}_password`,
    i: adminToken,
  });
  return {
    token: res.token as string,
    id: res.id as string,
    username,
  };
}

async function seed() {
  console.log("Creating initial admin...");
  const admin = await createInitialAdmin();

  console.log("Creating test users...");
  const testUserA = await createUser("test_user_a", admin.token);
  const testUserB = await createUser("test_user_b", admin.token);

  console.log("Creating test notes...");
  await api("notes/create", {
    i: testUserA.token,
    text: "Hello from test_user_a!",
  });
  await api("notes/create", {
    i: testUserB.token,
    text: "Hello from test_user_b!",
  });

  const credentials: TestCredentials = { admin, testUserA, testUserB };

  const { writeFileSync } = await import("fs");
  const { resolve } = await import("path");
  const credPath = resolve(import.meta.dirname!, "credentials.json");
  writeFileSync(credPath, JSON.stringify(credentials, null, 2));
  console.log(`Credentials written to ${credPath}`);
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
