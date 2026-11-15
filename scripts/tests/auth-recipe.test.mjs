import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, cp, mkdir, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const list = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n");
async function copy() {
  const dir = await mkdtemp(resolve(tmpdir(), "starter-recipe-test-"));
  for (const p of list) {
    await mkdir(dirname(resolve(dir, p)), { recursive: true });
    await cp(resolve(root, p), resolve(dir, p));
  }
  return dir;
}
function run(dir, choice) {
  return spawnSync(process.execPath, ["scripts/scaffold-auth.mjs", choice], {
    cwd: dir,
    encoding: "utf8",
  });
}
for (const choice of ["none", "better-auth"])
  test(`recipe ${choice} and rerun preservation`, async () => {
    const dir = await copy();
    try {
      await writeFile(resolve(dir, "apps/mobile/components/contributor-note.txt"), "preserve me");
      const result = run(dir, choice);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        await readFile(resolve(dir, "apps/mobile/components/contributor-note.txt"), "utf8"),
        "preserve me",
      );
      const api = JSON.parse(await readFile(resolve(dir, "apps/api/package.json")));
      assert.equal(Boolean(api.dependencies["better-auth"]), choice === "better-auth");
      if (choice === "none") {
        const generatedApi = await readFile(resolve(dir, "apps/api/src/app.ts"), "utf8");
        assert.match(generatedApi, /requestCount.add/);
        assert.match(generatedApi, /app.addContentTypeParser/);
        await assert.rejects(
          access(resolve(dir, "apps/api/src/migrations/0002_create_better_auth_tables.ts")),
        );
        assert.doesNotMatch(
          await readFile(resolve(dir, "apps/api/src/app.ts"), "utf8"),
          /createAuth|if \(auth\)/,
        );
      }
      await writeFile(resolve(dir, "apps/mobile/App.tsx"), "// user edit\n");
      assert.equal(run(dir, choice).status, 0);
      assert.equal(await readFile(resolve(dir, "apps/mobile/App.tsx"), "utf8"), "// user edit\n");
      assert.notEqual(run(dir, choice === "none" ? "better-auth" : "none").status, 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
test("changed input rejects generation before mutation", async () => {
  const dir = await copy();
  try {
    await writeFile(resolve(dir, "apps/mobile/App.tsx"), "// user edit\n");
    assert.notEqual(run(dir, "none").status, 0);
    await access(resolve(dir, "apps/api/src/auth.ts"));
    await assert.rejects(access(resolve(dir, ".starter/auth-selection.json")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
