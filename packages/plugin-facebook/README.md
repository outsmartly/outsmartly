# @outsmartly/plugin-facebook

> Trigger facebook events as per messagebus events at the edge

## Install

```bash
npm install --save @outsmartly/plugin-facebook
# or
yarn add @outsmartly/plugin-facebook
```

## Setup

Inside your `outsmartly.config.js` you can configure the `facebookPlugin()` and pass the result into the `plugins` array as below:

```js
import { facebookPlugin } from '@outsmartly/plugin-facebook';

export default {
  host: 'project.outsmartly.app',
  environments: [
    {
      name: 'production',
      origin: 'https://origin.com',
    },
  ],
  plugins: [
    facebookPlugin({
      ACCESS_TOKEN: '<facebook-access-token>',
      PIXEL_ID: '<facebook-pixel-id>',
    }),
  ],
};
```

In order to test sample facebook events few extra parameters can be passed to `facebookPlugin()` as below:

```js
facebookPlugin({
  ACCESS_TOKEN: '<facebook-access-token>',
  PIXEL_ID: '<facebook-pixel-id>',
  FB_TEST_EVENT: true, // default false
  TEST_EVENT_CODE: '<facebook-test-event-code>',// TEST29501
}),
```

## Implemented facebook events

- AddToCart
- PageView

## Todo to support all facebook standard events

[List of facebook standard events](https://developers.facebook.com/docs/facebook-pixel/reference#standard-events)

## References facebook developer docs

- Facebook [standard events](https://developers.facebook.com/docs/facebook-pixel/reference#standard-events)
- Facebook [custom events](https://developers.facebook.com/docs/facebook-pixel/implementation/conversion-tracking/#custom-events)
- Get started [using the conversions API](https://business.facebook.com/events_manager2/implementation_instructions/<some-pixel-id>?business_id=272015681234878)
- [Payload helper](https://developers.facebook.com/docs/marketing-api/conversions-api/payload-helper)
