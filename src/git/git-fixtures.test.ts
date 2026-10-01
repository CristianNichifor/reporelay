/** Fixture commits must work without a developer signing key. */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { simpleGit } from "simple-git";
import { createTestRepo } from "../../test/setup/test-repo.js";

afterEach(() => vi.unstubAllEnvs());

describe("isolated Git fixtures", () => {
  it("isolates commits, tags and branch names from global settings", async () => {
    const directory = await mkdtemp(join(tmpdir(), "reporelay-signing-"));
    const config = join(directory, "gitconfig");
    const globalConfig =
      "[commit]\n  gpgsign = true\n[tag]\n  gpgsign = true\n[gpg]\n  format = ssh\n[init]\n  defaultBranch = other\n";
    await writeFile(config, globalConfig);
    vi.stubEnv("GIT_CONFIG_GLOBAL", config);
    try {
      const repo = await createTestRepo({ "README.md": "synthetic fixture" });
      try {
        const commit = await simpleGit(repo.path).raw(["cat-file", "-p", "HEAD"]);
        expect(commit).toContain("initial commit");
        expect(commit).not.toContain("gpgsig");
        const git = simpleGit(repo.path);
        expect((await git.branch()).current).toBe("main");
        expect((await git.tags()).all).toContain("v1.0.0");
        expect((await git.raw(["cat-file", "-t", "v1.0.0"])).trim()).toBe("commit");
        expect(await readFile(config, "utf8")).toBe(globalConfig);
      } finally {
        await repo.cleanup();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
