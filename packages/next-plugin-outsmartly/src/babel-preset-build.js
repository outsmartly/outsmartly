const BABEL_PLUGIN_NAME = '@outsmartly/babel-plugin-outsmartly-react';

module.exports = function babelPresetBuild(options, { analysisDir = null } = {}) {
  const babelPluginConfig = analysisDir ? [BABEL_PLUGIN_NAME, { analysisDir }] : BABEL_PLUGIN_NAME;
  options.plugins.push(babelPluginConfig);
};
