import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectRoot } from "./sites-env.mjs";

const wranglerCli = fileURLToPath(
  new URL("../node_modules/wrangler/wrangler-dist/cli.js", import.meta.url),
);
const buildConfigPath = path.join(projectRoot, "dist/server/wrangler.json");
const runtimeDirectory = path.join(projectRoot, ".wrangler");
const buildId = readFileSync(
  path.join(projectRoot, "dist/server/BUILD_ID"),
  "utf8",
).trim();

if (!/^[A-Za-z0-9._-]+$/.test(buildId)) {
  throw new Error("O build não possui um BUILD_ID válido. Execute npm run build novamente.");
}

const snapshotsDirectory = path.join(runtimeDirectory, "builds");
const snapshotDirectory = path.join(snapshotsDirectory, buildId);
const snapshotServerDirectory = path.join(snapshotDirectory, "server");
const snapshotClientDirectory = path.join(snapshotDirectory, "client");
const configsDirectory = path.join(runtimeDirectory, "configs");
const runtimeConfigPath = path.join(configsDirectory, `${buildId}.json`);
const buildConfig = JSON.parse(readFileSync(buildConfigPath, "utf8"));

mkdirSync(snapshotsDirectory, { recursive: true });
if (!existsSync(snapshotDirectory)) {
  const temporarySnapshot = path.join(
    snapshotsDirectory,
    `.${buildId}-${process.pid}`,
  );
  try {
    mkdirSync(temporarySnapshot, { recursive: true });
    cpSync(path.join(projectRoot, "dist/server"), path.join(temporarySnapshot, "server"), {
      recursive: true,
      filter: (source) => path.basename(source) !== ".wrangler",
    });
    cpSync(path.join(projectRoot, "dist/client"), path.join(temporarySnapshot, "client"), {
      recursive: true,
    });
    renameSync(temporarySnapshot, snapshotDirectory);
  } catch (error) {
    rmSync(temporarySnapshot, { force: true, recursive: true });
    if (!existsSync(snapshotDirectory)) throw error;
  }
}

function runtimePath(absolutePath) {
  return path.relative(configsDirectory, absolutePath).replaceAll(path.sep, "/");
}

buildConfig.main = runtimePath(path.join(snapshotServerDirectory, "index.js"));
buildConfig.assets ??= {};
buildConfig.assets.directory = runtimePath(snapshotClientDirectory);
if (buildConfig.build?.watch_dir) {
  delete buildConfig.build.watch_dir;
}

mkdirSync(configsDirectory, { recursive: true });
if (!existsSync(runtimeConfigPath)) {
  writeFileSync(runtimeConfigPath, `${JSON.stringify(buildConfig, null, 2)}\n`, {
    mode: 0o600,
  });
}

const resolver = spawn(process.execPath, [
  path.join(projectRoot, "scripts/hostname-resolver.mjs"),
], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

const worker = spawn(process.execPath, [
  "--no-warnings",
  wranglerCli,
  "dev",
  "--config",
  runtimeConfigPath,
  "--env-file",
  path.join(projectRoot, ".env.local"),
  "--local",
  "--persist-to",
  path.join(projectRoot, ".wrangler/state"),
  "--ip",
  "127.0.0.1",
  "--inspector-port",
  "0",
  ...process.argv.slice(2),
], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

worker.on("error", (error) => {
  console.error("Falha ao iniciar o Worker local:", error.message);
  process.exitCode = 1;
});

resolver.on("error", (error) => {
  console.error("Falha ao iniciar o resolvedor de máquinas:", error.message);
});

worker.on("close", (code) => {
  if (!resolver.killed) resolver.kill("SIGTERM");
  process.exit(code ?? process.exitCode ?? 1);
});

process.once("SIGINT", () => {
  resolver.kill("SIGINT");
  worker.kill("SIGINT");
});
process.once("SIGTERM", () => {
  resolver.kill("SIGTERM");
  worker.kill("SIGTERM");
});
