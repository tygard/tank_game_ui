import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";

export default [
    js.configs.recommended,
    reactRecommended,
    {
        files: ['**/*.{js,jsx,mjs}'],
        plugins: {
            reactHooks,
        },
        rules: {
            "no-unused-vars": "off",
            "no-undef": "warn",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            "reactHooks/rules-of-hooks": "error",
            "reactHooks/exhaustive-deps": "warn",
            // Preact uses dashes for properties not camel case
            "react/no-unknown-property": "off",
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Mocha
                describe: "readonly",
                it: "readonly",
                xit: "readonly",
                // Timers
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
            }
        },
        settings: {
            react: {
              version: 'detect'
            }
          }
    }
];
