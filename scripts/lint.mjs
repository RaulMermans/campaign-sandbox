import { readFile } from "node:fs/promises";
import { Linter } from "eslint";

const linter = new Linter({ configType: "flat" });
const config = {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-debugger": "error",
    "no-var": "error",
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "prefer-const": "error",
  },
};

let errorCount = 0;

for (const filePath of ["eslint.config.mjs", "postcss.config.mjs"]) {
  const code = await readFile(filePath, "utf8");
  const messages = linter.verify(code, config, { filename: filePath });

  for (const message of messages) {
    const severity = message.severity === 2 ? "error" : "warning";
    console.log(`${filePath}:${message.line}:${message.column} ${severity} ${message.message} ${message.ruleId}`);
    if (message.severity === 2) {
      errorCount += 1;
    }
  }
}

process.exit(errorCount > 0 ? 1 : 0);
