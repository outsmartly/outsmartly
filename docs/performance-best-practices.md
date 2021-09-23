# Performance Best Practices / High Performance Checklist

## Cache Fully Rendered Pages in the CDN

Server response times are a critical component of delivering the fastest possible sites. Distance from origin servers adds latency \(delays\) to these response times, additionally excessive rendering work and blocking data requirements can significantly slow response times.

Building fast sites starts by delivering fast server responses with the entire HTML document. For the most part, that means either using Static Site Generation and caching the result, or using Server Side Rendering but still caching the result heavily; effectively resulting in "on demand" Static Site Generation.

Whichever technique you choose, both should be cached heavily using Outsmartly's global Content Delivery Network \(CDN\). The cache policy `stale-while-revalidate` is often a great choice for assuring that frequently changing content can still take full advantage of the performance of our CDN's cache. This caching strategy is effective because it serves cached content to users while asynchronously revalidating without blocking the response.

## A/B Testing, Personalization, Dynamic Content, to the Edge

One of the worst patterns for performance is blocking rendering behind the downloading, parsing, and execution of JavaScript. This pattern is frequently seen when implementing A/B Testing and Personalization. It has the worst impact on above-the-fold content.

Outsmartly provides a mechanism that we call Overrides, which allow for modification of cached HTML within the CDN. This technique minimizes latency introduced by compute cycles and assures that content is kept close to end user's geographical location.

## HTTP/2 Server Push Above-the-fold Resources

From an end user's perspective painting above-the-fold content \(initial content visible in the users viewport\) has the biggest impact on their perception of a page's loading performance. This importance is reflected in [Google's Lighthouse](https://web.dev/) performance metrics and [Core Web Vitals](https://web.dev/vitals/). In the Core Web Vitals paradigm the most critical single metric is Largest Contentful Paint \(LCP\). This measures when the most significant content is visible to the end user, often this is a large above-the-fold hero image.

HTTP/2 Server Push is a technique that allows the server to start sending specified resources to the browser before the browser has requested them. This technique can be used to significantly improve the initial load time of hero images and critical fonts.

Outsmartly provides an API to make this technique part of your performance toolbelt.

## First Party Resources \(Images, CSS, JS, Fonts\)

First party resources are those that are served from the same hostname as the one an end users requested for the webpage. Serving all critical resources from this same hostname can have a significant impact on loading performance. Hero images and fonts can be significantly delay Largest Contentful Paint if they are served from other domains. The cause of these delays is that for each unique domain the browser requests resources from it must first do a DNS lookup and negotiate the SSL connection before it can even begin downloading that resource. This extra setup time can add significant delays versus resources that are requested from the first party domain, which can usually reuse the existing connection.

It's important to note is the base domain is `www.example.com` and images are hosted on a different subdomain, such as `images.example.com`, this is a third party domain and will require another DNS lookup / SSL connection.

Outsmartly provides an abstraction that we can "intercepts" which makes it simple to "proxy" any resource through your first party domain without having to worry about the complexities of actually moving those resources under your first party domain.

## Custom Fonts

Custom fonts can cause significant performance delays. That said, when implemented with careful attention to performance loading patterns they can be effectively used with minimal impact. These patterns are grouped into two buckets, the first is assuring that the CSS `font-display` property is set to `swap` within the `@font-face` declaration. By setting this property to `swap` the browser is allowed to render text onto the page with a default font and later `swap` out the default font once the custom font has loaded. [Further reading](https://web.dev/avoid-invisible-text/)

```css
@font-face {
  font-family: 'Awesome Font';
  /* this is critical to prevent render blocking */
  font-display: swap;
  src: url('/fonts/awesome-l.woff2') format('woff2');
}
```

The second bucket of techniques relates to optimizing the loading of the font resources. If a font is not used on above-the-fold text then it's loading should not be prioritized as it may content with other higher priority resources \(like hero images\), however if the font is used for critical above the fold text it is usually desirable to load those fonts as quickly as possible. Doing so comes down to three parts:

1. Serve the font face from \(or proxy through\) your first party domain.
2. Embed font declarations in the head of your HTML document. This is particularly important when loading from font services like Google Fonts as these typically first load a small CSS file and then need to make a second request to load the actual font. This is made worse by the third party nature of these resources.
3. Server push the critical above-the-fold font resources. Pushing these after hero images usually results in the best loading patterns.

Outsmartly edge serves can be configured to optimize specific fonts as defined by the developer. Outsmartly will then transparently do the heavy lifting of embedding the required CSS in the document's head, caching the font, proxying third party fonts through your first party domain, and leveraging Server Push.

## CSS Embedding

CSS is treated as a render blocking resource by browsers, this means that until the CSS has been downloaded and parsed the browser will not render anything onto the screen. This can become most problematic to performance when CSS files are overly large and are served from third party domains as that introduces the delay of an additional DNS lookup/SSL negotiation. The most performant pattern we have seen for CSS is to embed it directly into the document's head within a `<style/>` tag as this completely eliminates the need for additional network requests. Ideally the CSS embedded into the head will only be critical above-the-fold CSS, although this can be harder to achieve in practice.

Outsmartly can be configured to automatically embed render blocking CSS into the documents head by turning link tags into embedded CSS.

## Image Optimizations

For illustrations, icons, and similar visuals, prefer vector-based image formats, such as SVG. This allows you to serve a single version for all users while still visually appearing high quality and sharp. While often smaller than traditional, raster images like photos, some SVG's can often be further optimized using tools such as [SVGOMG](https://jakearchibald.github.io/svgomg/).

For all other images, such as photographs, prefer JPEG's using optimal size and compression settings for a particular visitor's screen size. These variations can be provided using the `<img>` element's [`srcset` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-srcset). This can either be accomplished ahead of time, creating a set of various sizes, or, probably more ideally, generating the particular variation on-demand and then caching the result.

Services such as [Cloudinary](https://cloudinary.com/), [AWS Serverless Image Handler](https://aws.amazon.com/solutions/implementations/serverless-image-handler/), and others, offer a convenient API you can hit to generate these variations on-demand inside an Interceptor, where you can then cache the result indefinitely, so all future requests are served from the CDN without any added latency.

To learn more about the [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

## Avoiding Layout Shift

Layout shift is when visual elements of the page visually move position while the page is still loading. This can affect the user's perception of how fast a page is loading, make it hard for the user to start reading content right away, or in worst cases even cause them to click or otherwise interact with the wrong elements on the page.

The Web Vitals metric [Cumulative Layout Shift \(CLS\)](https://web.dev/cls/) tries to represent how much this happens on your page and how much of an impact it might have on User Experience.

Often the biggest offenders of layout shift are images which do not have their width or height set. In this case, the browser does not know how much blank space on the page to reserve while the image is still loading, so it renders nothing. Once it loads enough for that information to be known, the entire layout below \(or beside\) the image must shift to make room.

Another insidious case is where visual styling/CSS is loaded asynchronously, or otherwise loaded after the HTML they style has already been rendered. See the CSS Embedding section for tips on CSS best practices.

## Defer Non-critical Resources \(JS, Images, etc\)

Websites are often designed so that things above-the-fold, visible within the user's browser viewport on initial page load, are intended to be the most immediately relevant to first time viewers.

Often these include "hero sections" which contain a headline, an image or two, and a Call to Action \(CTA\). If you have similar content which is higher priority than other things on the page, you should defer loading of other non-essential resources until after this content has not only loaded, but has visually appeared/painted because it has the HTML, CSS, images, and fonts it needs.

Splitting your code into chunks and only serving the CSS and JavaScript you need for this page, not any others, is a great first start. JavaScript can often be delayed until after the initial HTML has rendered, which involves using `<script async`&gt; or `<script defer>` depending on your requirements.

