/* eslint-env node */
module.exports = {
  extends: ["prettier", "eslint:recommended", "plugin:import/recommended"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": ["error"],
    "no-var": ["error"],
    "no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ]
  },
  env: {
    node: true,
    web: true
  },
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  }
};
