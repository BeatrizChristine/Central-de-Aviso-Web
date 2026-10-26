import { spawn } from "node:child_process";
import process from "node:process";

const resolver = spawn(process.execPath, ["scripts/hostname-resolver.mjs"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

const web = spawn(process.execPath, ["scripts/run-framework.mjs", "dev", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (!web.killed) web.kill("SIGTERM");
  if (!resolver.killed) resolver.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 300).unref();
}

web.on("exit", (code) => stop(code ?? 0));
resolver.on("error", (error) => console.error("Falha ao iniciar o resolvedor de máquinas:", error.message));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
