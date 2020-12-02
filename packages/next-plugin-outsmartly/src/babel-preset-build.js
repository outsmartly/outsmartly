module.exports = function babelPresetBuild(options, config) {
  options.plugins.push('@outsmartly/babel-plugin-outsmartly-react');
};
