/**
 * Exercise the application's credential-isolated Git wrapper with untrusted operands.
 */
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestRepo, type TestRepo } from "../../test/setup/test-repo.js";
import {
  checkoutWorktree,
  listFiles,
  readFileFromMirror,
  resolveCommitSha,
  syncMirror,
} from "./git-sync.js";

let repo: TestRepo;
let root: string;
let mirror: string;
let marker: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "reporelay-git-security-"));
  marker = join(root, "helper-ran");
  repo = await createTestRepo({
    "README.md": "synthetic fixture",
    "--config=core.askPass=sentinel": "literal filename",
  });
  mirror = await syncMirror(repo.path, join(root, "mirrors"), "fixture");
});

afterAll(async () => {
  await repo?.cleanup();
  if (root) await rm(root, { recursive: true, force: true });
});

const optionPrefixes = [
  "--config=credential.helper=!touch ",
  "-ccredential.helper=!touch ",
  "--config=core.askPass=",
  "-ccore.askPass=",
  "--config-env=core.askPass=",
  "--config=protocol.ext.allow=",
  "--output=",
];

describe.each(optionPrefixes)("Git operand boundary: %s", (prefix) => {
  it("rejects an option-like repository source before cloning or fetching", async () => {
    const source = `${prefix}${marker}`;
    await expect(syncMirror(source, join(root, "mirrors"), "new")).rejects.toThrow(
      "Invalid Git repository source",
    );
    await expect(syncMirror(source, join(root, "mirrors"), "fixture")).rejects.toThrow(
      "Invalid Git repository source",
    );
    await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an option-like ref instead of returning rev-parse option output", async () => {
    await expect(resolveCommitSha(mirror, `${prefix}${marker}`)).rejects.toThrow("Invalid Git ref");
    await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects option-like commits in worktree and file-list operations", async () => {
    const commit = `${prefix}${marker}`;
    await expect(checkoutWorktree(mirror, join(root, "worktrees"), commit)).rejects.toThrow(
      "Invalid Git commit",
    );
    await expect(listFiles(mirror, commit, [])).rejects.toThrow("Invalid Git commit");
    await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not interpret an option-like commit when reading file content", async () => {
    expect(await readFileFromMirror(mirror, `${prefix}${marker}`, "README.md")).toBeNull();
    await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

it("preserves normal refs and treats option-like filenames as data", async () => {
  const sha = await resolveCommitSha(mirror, "refs/heads/main");
  expect(sha).toMatch(/^[a-f0-9]{40}$/);
  expect(await resolveCommitSha(mirror, "HEAD~0")).toBe(sha);
  expect(await readFileFromMirror(mirror, sha, "--config=core.askPass=sentinel")).toBe(
    "literal filename",
  );
});

it("keeps external Git transports disabled through the application wrapper", async () => {
  await expect(
    syncMirror(`ext::touch ${marker}`, join(root, "mirrors"), "external"),
  ).rejects.toThrow(/transport 'ext' not allowed/);
  await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
});
