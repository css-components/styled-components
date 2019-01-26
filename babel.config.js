const { BABEL_ENV, NODE_ENV } = process.env;
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'commonjs' : false;

const loose = true;

module.exports = api => {
  api.cache(true);

  return {
    presets: [
      ['@babel/preset-env', { loose, modules }],
      '@babel/preset-react',
      '@babel/preset-flow',
    ],
    plugins: [
      'preval',
      ['@babel/plugin-proposal-class-properties', { loose }],
      ['transform-react-remove-prop-types', { mode: 'unsafe-wrap' }],
      // modules === 'commonjs' && 'add-module-exports',
    ].filter(Boolean),
  };
};
