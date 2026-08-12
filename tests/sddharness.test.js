import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, it, after } from "node:test";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(KIT, "bin", "sddharness");
const SCHEMA = join(KIT, "schema", "feature_list.schema.json");

describe("sddharness schema", () => {
  it("schema file exists and is valid JSON", () => {
    const raw = readFileSync(SCHEMA, "utf8");
    const schema = JSON.parse(raw);
    assert.equal(schema.title, "sddharness feature_list");
    assert.ok(schema.properties.features);
  });

  it("accepts feature-01 naming pattern in schema", () => {
    const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
    const pattern = schema.properties.features.items.properties.name.pattern;
    assert.equal(pattern, "^feature-[0-9]{2,}$");
    assert.ok(new RegExp(pattern).test("feature-01"));
    assert.ok(new RegExp(pattern).test("feature-99"));
    assert.ok(!new RegExp(pattern).test("feature-1"));
  });
});

describe("sddharness init", () => {
  const dest = mkdtempSync(join(tmpdir(), "sddharness-"));

  after(() => {
    rmSync(dest, { recursive: true, force: true });
  });

  it("copies skeleton without error", () => {
    const r = spawnSync(process.execPath, [CLI, "init", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(join(dest, "AGENTS.md")));
    assert.ok(existsSync(join(dest, "feature_list.json")));
    assert.ok(existsSync(join(dest, ".sddharness", "config.json")));
    assert.ok(existsSync(join(dest, ".cursor", "commands", "sddharness.md")));
    assert.ok(existsSync(join(dest, ".claude", "commands", "sddharness.md")));
    assert.ok(existsSync(join(dest, ".claude", "agents", "leader.md")));
    assert.ok(existsSync(join(dest, ".cursor", "agents", "jira_importer.md")));
    assert.ok(existsSync(join(dest, "scripts", "validate-features.mjs")));
    assert.ok(existsSync(join(dest, "init.sh")));
  });

  it("does not overwrite existing AGENTS.md on second init", () => {
    const marker = "# CUSTOM AGENTS\n";
    writeFileSync(join(dest, "AGENTS.md"), marker);
    const r = spawnSync(process.execPath, [CLI, "init", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.equal(readFileSync(join(dest, "AGENTS.md"), "utf8"), marker);
  });

  it("validate passes on empty feature list", () => {
    const r = spawnSync(process.execPath, [CLI, "validate", dest], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
});

describe("validate-features name rule", () => {
  it("rejects feature-1 (no zero-pad)", () => {
    const dir = mkdtempSync(join(tmpdir(), "harness-bad-"));
    try {
      mkdirSync(join(dir, "scripts"), { recursive: true });
      mkdirSync(join(dir, "specs"), { recursive: true });
      // copy validator
      const validator = readFileSync(
        join(KIT, "template", "scripts", "validate-features.mjs"),
        "utf8"
      );
      writeFileSync(join(dir, "scripts", "validate-features.mjs"), validator);
      writeFileSync(
        join(dir, "feature_list.json"),
        JSON.stringify({
          project: "t",
          rules: { valid_status: ["pending"] },
          features: [
            {
              id: 1,
              name: "feature-1",
              title: "x",
              description: "y",
              acceptance: [],
              sdd: true,
              status: "pending",
            },
          ],
        })
      );
      const r = spawnSync(
        process.execPath,
        [join(dir, "scripts", "validate-features.mjs")],
        { cwd: dir, encoding: "utf8" }
      );
      assert.notEqual(r.status, 0);
      assert.match(r.stdout + r.stderr, /feature-01/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
