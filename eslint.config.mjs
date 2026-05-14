import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "dist/**"]
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "simple-import-sort": simpleImportSort
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='styles'][computed=false][property.type='Identifier']",
          message: "Use CSS Modules via styles[\"class-name\"] for consistency."
        }
      ],
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react$", "^next", "^@?\\w"],
            ["^@/"],
            ["^\\.(?!.*\\.(?:css|scss|sass|less)$)"],
            ["^.+\\.(?:css|scss|sass|less)$"]
          ]
        }
      ]
    }
  }
];

export default eslintConfig;
