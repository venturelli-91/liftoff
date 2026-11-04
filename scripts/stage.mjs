// Local staging deploy for the orchestrator's `command` target.
//   node scripts/stage.mjs deploy    -> builds ORCH_SHA from the current checkout and (re)starts it
//   node scripts/stage.mjs rollback  -> restarts the release of ORCH_PREVIOUS (it must have been deployed here before)
// Releases live outside the checkout, in ~/.liftoff-stage, so removing the checkout never touches a running release.
import { execSync, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PORT = 4600;
const STAGE = join(homedir(), ".liftoff-stage");
const mode = process.argv[2];
const sha =
  mode === "rollback" ? process.env.ORCH_PREVIOUS : process.env.ORCH_SHA;
if (
  !["deploy", "rollback"].includes(mode) ||
  !/^[0-9a-f]{7,40}$/.test(sha ?? "")
) {
  console.error(
    "usage: node scripts/stage.mjs deploy|rollback (with ORCH_SHA / ORCH_PREVIOUS set to a commit)",
  );
  process.exit(2);
}

const release = join(STAGE, "releases", sha);
mkdirSync(join(STAGE, "data"), { recursive: true });

if (mode === "deploy" && !existsSync(join(release, ".next"))) {
  cpSync(process.cwd(), release, {
    recursive: true,
    filter: (p) =>
      !/[\\/](\.git|node_modules|\.next)([\\/]|$)/.test(
        p.slice(process.cwd().length),
      ),
  });
  execSync("npm ci --ignore-scripts --no-audit --no-fund", {
    cwd: release,
    stdio: "inherit",
  });
  execSync("npm run build", { cwd: release, stdio: "inherit" });
}
if (!existsSync(join(release, ".next"))) {
  console.error(`${mode}: no built release for ${sha} in ${STAGE}`);
  process.exit(1);
}

const pidFile = join(STAGE, "pid");
if (existsSync(pidFile)) {
  try {
    process.kill(Number(readFileSync(pidFile, "utf8")));
  } catch {}
}

const next = join(release, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "start", "-p", String(PORT)], {
  cwd: release,
  env: {
    ...process.env,
    LIFTOFF_DB: join(STAGE, "data", "liftoff.db"),
    LIFTOFF_WEBHOOK_SECRET: "staging-local-secret",
    LIFTOFF_SHA: sha,
  },
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});
child.unref();
writeFileSync(pidFile, String(child.pid));

for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) {
      console.log(`${mode} ok ${sha}`);
      process.exit(0);
    }
  } catch {}
}
console.error(`${mode}: /api/health never came up on port ${PORT}`);
process.exit(1);
