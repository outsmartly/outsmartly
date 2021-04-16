# @outsmartly/plugin-image-optimizations

Outsmartly's image optimization plugin provides a convenient mechanism to optimize images.

The plugin combines an image resizing and compression service of your choice—such as Cloudinary, imgix, or others—with intelligent device detection and HTTP/2 Push (or Link rel=preload), all served from your first-party domain; for even more performance gains.

With it, you'll be able to serve different sizes, compression levels, or even totally different images based on device type. Add the `data-outsmartly-preload` attribute to any images that are critical (e.g. above the fold) and Outsmartly will also automatically push the right image to the browser too.

Here's an example, if you were using Cloudinary:

```js
export default function ExamplePage() {
  return (
    <>
      <h1>Example</h1>
      <img
        src={imgSrc({
          mobile: 'w_200,e_sharpen/remote_media/my-example.jpg',
          desktop: 'w_600,e_sharpen/remote_media/my-example.jpg',
        })}
        // Uses HTTP/2 Push (or Link rel=preload if not supported)
        data-outsmartly-preload
      />
    </>
  );
}
```

## Install

```bash
npm install --save @outsmartly/plugin-image-optimizations
# or
yarn add @outsmartly/plugin-image-optimizations
```

## Setup

Inside your `outsmartly.config.js` you can call the `imageOptimizationPlugin()` function and pass the result into the `plugins` array like so:

```js
import { imageOptimizationPlugin } from '@outsmartly/plugin-image-optimizations';

export default {
  host: 'your-project.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://your-origin.com',
    },
  ],
  plugins: [imageOptimizationPlugin()],
  //        ^^^^^^^^^^^^^^^^^^^^^^^^^
};
```

### React App

The `imageOptimizationFormatter()` factory function generates another function you then use inside your components to generate your `<img src>` URLs:

```jsx
import { imageOptimizationFormatter } from '@outsmartly/plugin-image-optimizations';

// Export this inside a utils.js file or similar,
// then you can import it throughout your app
export const imgSrc = imageOptimizationFormatter({
  baseURL: 'https://some-image-service.com/example/image/upload/',
});

export default function ExamplePage() {
  return (
    <>
      <h1>Example</h1>
      <img
        src={imgSrc({
          // mobile/tablet are optional
          mobile: 'w_200,e_sharpen/remote_media/my-example.jpg',
          tablet: 'w_400/remote_media/my-example.jpg',
          desktop: 'w_600/remote_media/my-example.jpg',
        })}
        // Uses HTTP/2 Push (or Link rel=preload if not supported)
        data-outsmartly-preload
      />
    </>
  );
}
```

> Note that `mobile` and `tablet` are optional, but `desktop` is not as it is used as the fallback.

## Options

```ts
interface FormatterOptions {
  /**
   * Required. The remote service you wish for Outsmartly's CDN edge servers to
   * call to get the image.
   */
  baseURL: string;

  /**
   * Optional. Change the base path used. Defaults to: '/outsmartly-images'
   */
  path?: string;
}

interface Choices {
  // Only 'desktop' is required, and will be used as the fallback
  mobile?: string;
  tablet?: string;
  desktop: string;
}

type imageOptimizationFormatter = (options: FormatterOptions) => (choices: Choices) => string;

interface PluginOptions {
  /**
   * Optional. Change the base path used. Defaults to: '/outsmartly-images'
   */
  path?: string;
}

type imageOptimizationPlugin = (options?: PluginOptions) => Plugin;
```

## FAQ

#### Does it HTTP/2 Push the correctly chosen image? mobile, tablet, desktop?

Yes it does! 🧙‍♂️

#### What about `background-image` and `background-size: cover`?

Because screen readers and search engine bots don't typically "see" CSS background images, they are best suited for when the image has no semantic meaning. In contrast, for images like your Hero image above the fold, visualizations, diagrams, and similar, it's important to use an `<img>` element.

If you need behavior similar to `background-size: cover`, modern browsers [(not IE11)](https://caniuse.com/?search=object-fit%3A%20cover) support [`object-fit: cover`](https://css-tricks.com/almanac/properties/o/object-fit/).

#### What about browser/proxy caching?

We set the `Vary: User-Agent` and `Cache-Control: no-transform` headers, so browsers (and others) will not accidentally show the wrong image.
