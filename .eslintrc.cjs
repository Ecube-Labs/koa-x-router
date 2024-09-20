module.exports = {
    env: {
        es6: true,
        node: true,
        'jest/globals': true,
    },
    parserOptions: {
        project: './tsconfig.lint.json',
    },
    extends: [
        'airbnb-typescript/base',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:jest/recommended', // includes plugin: jest
        'plugin:jest/style',
        'plugin:prettier/recommended', // includes plugin: prettier
    ],
    rules: {
        'prettier/prettier': 'error',
        eqeqeq: 'error',
        'spaced-comment': ['error', 'always', { markers: ['/'] }],
        'global-require': 'off',
        'no-bitwise': 'off',
        'no-underscore-dangle': 'off',
        'no-param-reassign': 'off',
        'no-return-await': 'off',
        'no-multi-assign': 'off',
        'no-unused-expressions': 'off',
        'no-throw-literal': 'off',
        'no-plusplus': 'off',
        'no-shadow': 'off',
        'no-continue': 'off',
        'guard-for-in': 'off',
        'no-loop-func': 'off',
        'no-restricted-syntax': ['error', 'WithStatement'],
        'import/no-dynamic-require': 'off',
        'import/order': ['error', { 'newlines-between': 'never' }],
        'import/prefer-default-export': 'off',
        'import/no-duplicates': 'off',
        'import/no-unresolved': 'error',

        /**
         * For DDD
         */
        'max-classes-per-file': 'off',

        /**
         * For Jest, Storybook
         */
        'import/no-extraneous-dependencies': [
            'error',
            { devDependencies: ['**/*.spec.*', '**/*.test.*', '**/*.stories.*'] },
        ],

        /**
         * For TypeScript
         */
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-shadow': 'warn',
        '@typescript-eslint/no-loop-func': 'off',
        'no-use-before-define': 'off', // with @typescript-eslint/no-use-before-define
        '@typescript-eslint/no-use-before-define': [
            'error',
            { typedefs: false, functions: false, classes: false, variables: true },
        ],
        'no-unused-vars': 'off', // with @typescript-eslint/no-unused-vars
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_',
            },
        ],
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
            },
        },
    },
    // https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/FAQ.md#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
    overrides: [
        {
            files: ['*.ts'],
            rules: {
                'no-undef': 'off',
            },
        },
    ],
};
