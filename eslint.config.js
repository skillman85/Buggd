import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "lib/**",
      "test-results/**",
      "web/public/theme-init.js",
      "*.tgz",
    ],
  },
  js.configs.recommended,
  {
    files: ["scripts/*.mjs", "*.js"],
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
