const { OutsmartlyScript } = require('@outsmartly/react');
const React = require('react');

exports.onRenderBody = ({ setPostBodyComponents }) => {
  setPostBodyComponents([<OutsmartlyScript key="outsmartly-script" />]);
};
