# gatsby-plugin-outsmartly

The Outsmartly [Gatsby](https://www.gatsbyjs.com/) plugin automatically integrates the Outsmartly SDK. It hooks into the compilation phase, client-side preloading, handles boilerplate code, and more.

## Install

```text
npm install --save @outsmartly/gatsby-plugin-outsmartly
```

Next, add `'@outsmartly/gatsby-plugin-outsmartly'` to the `plugins` array inside your `gatsby-config.js`:

### gatsby-config.js

```javascript
// Your file probably looks much more complex than this

module.exports = {
  plugins: ['@outsmartly/gatsby-plugin-outsmartly'],
  // etc...
};
```

Now we can initialize our project with Outsmartly:

```text
npx outsmartly init
```

After following the prompts, you should now have a new `outsmartly.config.js` where you can add route Overrides and Interceptors.

