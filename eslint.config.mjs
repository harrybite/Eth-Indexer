import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

const tsOnlyConfigs = tseslint
  .config(
    {
      languageOptions: {
        parserOptions: {
          project: ["./tsconfig.json"],
          tsconfigRootDir: import.meta.dirname
        }
      }
    },
    ...tseslint.configs.recommendedTypeChecked,
    eslintConfigPrettier,
  )
  .map((cfg) => ({ ...cfg, files: ["**/*.ts"] }));

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  ...tsOnlyConfigs
];
