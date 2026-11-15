import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const choice = process.argv[2] ?? "none";
if (!["none", "better-auth"].includes(choice))
  throw new Error("Choose none or better-auth: node scripts/scaffold-auth.mjs <choice>");
const stateFile = resolve(root, ".starter/auth-selection.json");
let previous;
try {
  previous = JSON.parse(await readFile(stateFile, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (previous) {
  if (previous.choice !== choice)
    throw new Error(
      "Auth choice is already recorded. Use a fresh template copy to change it; existing app files will not be overwritten.",
    );
  console.log(`Auth choice ${choice} already applied; preserving all files.`);
  process.exit(0);
}
const manifest = JSON.parse(
  await readFile(resolve(root, "scripts/auth-recipe-manifest.json"), "utf8"),
);
const sources = new Map();
for (const [file, expected] of Object.entries(manifest.files)) {
  const content = await readFile(resolve(root, file), "utf8");
  if (createHash("sha256").update(content).digest("hex") !== expected)
    throw new Error(
      `Recipe input changed: ${file}. Use a fresh template copy; no files have been changed.`,
    );
  sources.set(file, content);
}
const updates = new Map();
const deletions = choice === "none" ? manifest.remove : [];
if (choice === "none") {
  for (const file of manifest.strip) {
    let content = sources
      .get(file)
      .replace(/^[ \t]*\/\/ auth-recipe:start\n[\s\S]*?^[ \t]*\/\/ auth-recipe:end\n/gm, "");
    if (file.endsWith("app.ts"))
      content = content.replace(
        '  if (process.env.NODE_ENV === "production" && corsOrigins',
        '  const corsOrigins = process.env.WEB_ORIGIN?.split(",").map(value => value.trim()).filter(Boolean) ?? (process.env.NODE_ENV === "production" ? [] : true);\n  if (process.env.NODE_ENV === "production" && corsOrigins',
      );
    updates.set(file, content);
  }
  for (const workspace of ["api", "web", "mobile"]) {
    const file = `apps/${workspace}/package.json`;
    const pkg = JSON.parse(sources.get(file));
    for (const name of manifest.dependencies[workspace]) {
      delete pkg.dependencies?.[name];
      delete pkg.devDependencies?.[name];
    }
    delete pkg.scripts["test:auth"];
    delete pkg.scripts["test:telemetry"];
    delete pkg.scripts["auth:provision-user"];
    if (workspace === "mobile") pkg.scripts.lint = "prettier --check App.tsx app.json";
    if (workspace === "web")
      pkg.scripts.lint =
        "prettier --check app lib next.config.ts postcss.config.mjs tsconfig.json components.json";
    updates.set(file, JSON.stringify(pkg, null, 2) + "\n");
  }
  updates.set(
    ".github/workflows/ci.yml",
    sources
      .get(".github/workflows/ci.yml")
      .replace(/  auth-integration:\n[\s\S]*?(?=  publish:)/, "")
      .replace(/^.*npm run test:(?:auth|email) --workspace=.*\n/gm, ""),
  );
  const apiPackage = JSON.parse(updates.get("apps/api/package.json"));
  delete apiPackage.scripts["test:email"];
  updates.set("apps/api/package.json", JSON.stringify(apiPackage, null, 2) + "\n");
  const config = JSON.parse(sources.get("apps/mobile/app.json"));
  delete config.expo.scheme;
  delete config.expo.plugins;
  updates.set("apps/mobile/app.json", JSON.stringify(config, null, 2) + "\n");
  updates.set(
    ".env.example",
    sources.get(".env.example").replace(/^(BETTER_AUTH_\w+|AUTH_TRUSTED_ORIGINS)=.*\n/gm, ""),
  );
  updates.set(
    "apps/api/src/email.ts",
    sources
      .get("apps/api/src/email.ts")
      .replace('export type AuthEmailPurpose = "verification" | "password-reset";\n', "")
      .split("function escapeHtml")[0],
  );
  updates.set(
    "apps/web/app/page.tsx",
    `export default async function HomePage() {
  let available = false;
  try { available = (await fetch(new URL('/health', process.env.API_URL ?? 'http://localhost:4000'), { cache: 'no-store' })).ok; } catch {}
  return <main><h1>Project Starter</h1><p>API: {available ? 'available' : 'unavailable'}</p></main>;
}\n`,
  );
  updates.set(
    "apps/web/app/layout.tsx",
    `import type { ReactNode } from 'react';\nexport const metadata = { title: 'Project Starter' };\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n`,
  );
  updates.set(
    "apps/mobile/App.tsx",
    `import './global.css';\nimport { useEffect, useState } from 'react';\nimport { Text, View } from 'react-native';\nexport default function App() { const [status, setStatus] = useState('checking'); useEffect(() => { const controller = new AbortController(); fetch((process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000') + '/health', { signal: controller.signal }).then(r => setStatus(r.ok ? 'available' : 'unavailable')).catch(() => { if (!controller.signal.aborted) setStatus('unavailable'); }); return () => controller.abort(); }, []); return <View className="flex-1 justify-center p-7"><Text>Project Starter</Text><Text>API: {status}</Text></View>; }\n`,
  );
}
// Validate all inputs and compute every output before the first mutation.
for (const file of sources.keys()) {
  if (deletions.some((path) => file === path || file.startsWith(path + "/"))) {
    await rm(resolve(root, file), { force: true });
  }
}
for (const [file, content] of updates) await writeFile(resolve(root, file), content);
await mkdir(dirname(stateFile), { recursive: true });
await writeFile(stateFile, JSON.stringify({ choice, version: 1 }, null, 2) + "\n");
console.log(
  `Auth choice ${choice} applied. Run npm install to reconcile the lockfile, then the workspace checks. Use a fresh copy to change this choice.`,
);
