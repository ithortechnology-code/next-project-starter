import { execFileSync } from "node:child_process";
import { mkdtemp, cp, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n");
if (!process.env.AUTH_TEST_DATABASE_URL)
  throw new Error("AUTH_TEST_DATABASE_URL is required for full recipe verification");
const requested = process.argv[2];
if (requested && !["none", "better-auth"].includes(requested))
  throw new Error("Choose none or better-auth");
for (const choice of requested ? [requested] : ["none", "better-auth"]) {
  const dir = await mkdtemp(resolve(tmpdir(), "starter-recipe-verify-"));
  const run = (cmd, args, env = {}) =>
    execFileSync(cmd, args, { cwd: dir, stdio: "inherit", env: { ...process.env, ...env } });
  let databaseAdmin;
  let databaseName;
  let isolatedDatabaseUrl;
  try {
    for (const file of files) {
      await mkdir(dirname(resolve(dir, file)), { recursive: true });
      await cp(resolve(root, file), resolve(dir, file));
    }
    run(process.execPath, ["scripts/scaffold-auth.mjs", choice]);
    run("npm", ["install", "--ignore-scripts"]);
    if (choice === "none")
      run("npx", [
        "prettier",
        "--write",
        "apps/api/src/app.ts",
        "apps/api/src/email.ts",
        "apps/web/app/page.tsx",
        "apps/web/app/layout.tsx",
        "apps/mobile/App.tsx",
        "apps/mobile/app.json",
        "packages/shared/src/index.ts",
      ]);
    if (process.env.AUTH_TEST_DATABASE_URL) {
      const seed = new URL(process.env.AUTH_TEST_DATABASE_URL);
      if (!/(^|[_-])test($|[_-])/.test(seed.pathname.slice(1)))
        throw new Error("A test database URL is required");
      const { Client } = await import("pg");
      databaseAdmin = new Client({ connectionString: seed.href });
      await databaseAdmin.connect();
      databaseName = `starter_recipe_test_${choice.replace("-", "_")}_${Date.now()}`;
      await databaseAdmin.query(`CREATE DATABASE "${databaseName}"`);
      seed.pathname = "/" + databaseName;
      isolatedDatabaseUrl = seed.href;
      run("npm", ["run", "db:migrate", "--workspace=@starter/api"], {
        DATABASE_URL: isolatedDatabaseUrl,
      });
    }
    for (const check of ["lint", "typecheck", "build"]) run("npm", ["run", check]);
    if (choice === "better-auth") {
      run("npm", ["run", "test:auth", "--workspace=@starter/mobile"]);
      run("npm", ["run", "test:email", "--workspace=@starter/api"]);
      run("npm", ["run", "test:telemetry", "--workspace=@starter/api"]);
      if (process.env.AUTH_TEST_DATABASE_URL) {
        run("npm", ["run", "test:auth", "--workspace=@starter/api"], {
          AUTH_TEST_DATABASE_URL: isolatedDatabaseUrl,
        });
        run("npm", ["run", "test:auth", "--workspace=@starter/web"], {
          AUTH_TEST_DATABASE_URL: isolatedDatabaseUrl,
        });
      }
    } else {
      run(
        process.execPath,
        [
          "--import=tsx",
          "--input-type=module",
          "-e",
          `const {createApp}=await import('./apps/api/src/app.ts');const app=createApp(); const health=await app.inject({url:'/health'}); const auth=await app.inject({url:'/api/auth/get-session'});if(health.statusCode!==200||auth.statusCode!==404)throw Error('No-auth route smoke failed');await app.close();`,
        ],
        { NODE_ENV: "production", DATABASE_URL: "", WEB_ORIGIN: "http://localhost:3000" },
      );
      const lock = JSON.parse(await readFile(resolve(dir, "package-lock.json"), "utf8"));
      if (
        Object.keys(lock.packages).some((name) =>
          /node_modules\/(better-auth|@better-auth\/expo)$/.test(name),
        )
      )
        throw Error("Auth dependency remains in no-auth lock");
    }
    console.log(`Verified clean ${choice} recipe locally.`);
  } finally {
    if (databaseAdmin) {
      try {
        if (databaseName) await databaseAdmin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
      } finally {
        await databaseAdmin.end();
      }
    }
    await rm(dir, { recursive: true, force: true });
  }
}
