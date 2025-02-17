import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**"],
  },
  // Base config for all TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...compat.extends("plugin:@typescript-eslint/recommended")[0],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error"],
      "@typescript-eslint/no-explicit-any": ["error"],
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }]
    }
  },
  // Next.js specific config
  {
    files: ["web/**/*.ts", "web/**/*.tsx"],
    ...compat.extends("next/core-web-vitals")[0],
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "@typescript-eslint/explicit-function-return-type": "off" // Often not needed in Next.js pages/components
    }
  }
];

export default eslintConfig;
