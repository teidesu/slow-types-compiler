import antfu from '@antfu/eslint-config'

export default antfu({
    stylistic: {
        indent: 4,
    },
    typescript: true,
    rules: {
        'curly': ['error', 'multi-line'],
        'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        'n/prefer-global/buffer': 'off',
        'no-restricted-globals': ['error', '__dirname', 'require'],
        'style/quotes': ['error', 'single', { avoidEscape: true }],
        'antfu/if-newline': 'off',
    },
})
