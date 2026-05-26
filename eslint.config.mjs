import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const projectFiles = [
  "app/**/*.tsx",
  "components/**/*.tsx",
  "lib/**/*.ts",
  "tests/**/*.ts",
  "next.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
];

const nextProjectConfig = nextCoreWebVitals.map((config) => {
  if ("files" in config) {
    return {
      ...config,
      files: projectFiles,
    };
  }

  return config;
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".claude/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...nextProjectConfig,
  {
    files: projectFiles,
    rules: {
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["*.config.{js,mjs,cjs}", "eslint.config.mjs", "postcss.config.mjs"],
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
  },
];

export default eslintConfig;
