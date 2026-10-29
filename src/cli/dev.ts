// Development runner keeps Vite and the API on explicit, protected loopback ports.
process.env.NODE_ENV = "development";
process.argv = [
  process.argv[0],
  process.argv[1],
  "--port",
  "8787",
  "--no-open",
];
await import("./index.js");
export {};
