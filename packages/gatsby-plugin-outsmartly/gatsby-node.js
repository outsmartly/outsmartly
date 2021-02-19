exports.onCreateBabelConfig = ({ actions }) => {
  actions.setBabelPlugin({
    name: require.resolve('@outsmartly/babel-plugin-outsmartly-react'),
  });
};
