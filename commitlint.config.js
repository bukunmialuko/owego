module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'docs', 'chore', 'test', 'build', 'perf'],
    ],
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],

    'body-empty': [2, 'always'],
    'footer-empty': [2, 'always'],
    'no-attribution-trailer': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'no-attribution-trailer': ({ raw }) => [
          !/co-authored-by|generated with/i.test(raw ?? ''),
          'Commits are authored by humans: remove the attribution trailer.',
        ],
      },
    },
  ],
};
