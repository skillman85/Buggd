import { chmod } from "node:fs/promises";
await chmod(new URL("../lib/cli/index.js", import.meta.url), 0o755);
