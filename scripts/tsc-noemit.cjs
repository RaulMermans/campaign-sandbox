process.argv = [process.argv[0], require.resolve("typescript/lib/tsc.js"), "--noEmit"];

require("typescript/lib/tsc.js");

setTimeout(() => {
  process.exit(process.exitCode ?? 0);
}, 50);
