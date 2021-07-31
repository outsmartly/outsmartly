import { Plugin } from '@outsmartly/core';

/**
 * A custom Outsmartly plugin that attaches listeners for various message types
 */
export function limespotPlugin(): Plugin {
  return {
    name: '@outsmartly/plugin-limespot',
    setup: ({ config, messageBus }) => {
      messageBus.on(
        'boxRender',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: `${eventTypeMap['boxRender']}RecommendationsRendered`,
          IntData: message.data.integerData,
          ScreenResolution: message.data.resolution,
          Source: standardizeSource(message.data.boxKey),
          SourcePage: standardizeSourcePage(message.data.page),
        })),
      );

      messageBus.on(
        'itemView',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: eventTypeMap['itemView'],
          ReferenceIdentifier: message.data.productId,
          ScreenResolution: message.data.resolution,
          // Source: standardizeSource(message.data.referComponent),
          // SourcePage: standardizeSourcePage(message.data.referPage),
        })),
      );

      messageBus.on(
        'itemTimeSpend',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: eventTypeMap['itemTimeSpend'],
          IntData: message.data.integerData,
          ReferenceIdentifier: message.data.productId,
          ScreenResolution: message.data.resolution,
          // Source: standardizeSource(message.data.referComponent),
          // SourcePage: standardizeSourcePage(message.data.referPage),
        })),
      );

      messageBus.on(
        'collectionView',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: eventTypeMap['collectionView'],
          ReferenceIdentifier: message.data.collectionId,
          ScreenResolution: message.data.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Collection',
        })),
      );

      messageBus.on(
        'collectionTimeSpend',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: eventTypeMap['collectionTimeSpend'],
          IntData: message.data.integerData,
          ReferenceIdentifier: message.data.collectionId,
          ScreenResolution: message.data.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Unknown',
        })),
      );

      messageBus.on(
        'variantAddToCart',
        createMessageListener((message) => ({
          ActivityTime: message.data.timestamp,
          Event: eventTypeMap['variantAddToCart'],
          IntData: message.data.integerData,
          ReferenceIdentifier: message.data.variantId,
          ScreenResolution: message.data.resolution,
          // Source: standardizeSource(message.data.source),
          // SourcePage: standardizeSourcePage(message.data.sourcePage),
          // Source: 'StandardNavigation',
          // SourcePage: 'collection',
          // Source: 'CrossSell',
          // SourcePage: 'product',
          // Source: 'BoughtTogether',
          // SourcePage: 'Cart',
        })),
      );

      messageBus.on(
        'cartTimeSpend',
        createMessageListener((message) => ({
          // ActivityTime: message.data.timestamp,
          // Event: eventTypeMap['cartTimeSpend'],
          // IntData: message.data.integerData,
          // ReferenceIdentifier: message.data.productId,
          // ScreenResolution: message.data.resolution,
          //Source: standardizeSource(message.data.source),
          //SourcePage: standardizeSourcePage(message.data.sourcePage),
        })),
      );
    },
  } as Plugin;
}

/**
 * Creates listener functions that return data in the format needed.
 */
function createMessageListener(mapper) {
  // `event` will be an OutsmartlyEvent
  return async (event) => {
    const contextId = event.cookies.get('lsContextID');
    if (!contextId) {
      throw new Error(`Missing contextId`);
    }
    const formattedLimespotEvent = mapper(event.message);
    bufferedLimespotEvents.push(formattedLimespotEvent);
    // Hey, just wait for a while, while other messages are added
    await scheduleBatchSend(contextId);
  };
}

// An array to hold a batch of activities
const bufferedLimespotEvents = [];
let isThrottling = false;

/**
 * Schedules the array/batch of activities to be sent
 */
function scheduleBatchSend(contextId: string) {
  if (isThrottling) {
    return;
  }
  isThrottling = true;
  return new Promise<void>((resolve) => {
    queueMicrotask(async () => {
      isThrottling = false;
      const body = JSON.stringify(bufferedLimespotEvents);
      // CRITICAL that this is cleared BEFORE fetch()
      bufferedLimespotEvents.length = 0;
      await logActivityBatch(contextId, body);
      resolve();
    });
  });
}

/**
 * Prepares and sends a request to Limespot's activityLogs endpoint
 */
async function logActivityBatch(contextID: string, payload: string) {
  // Prepare the request
  const prefix = 'https://storefront.personalizer.io/v1';
  const resource = `${prefix}/activityLogs`;
  const params = {
    batch: 'true',
    t: String(Date.now()),
  };
  const queryString = '?' + new URLSearchParams(params).toString();
  const url = `${resource}${queryString}`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Personalizer-Context-ID': contextID,
    },
    body: payload,
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    console.error(`Error in logActivityBatch: ${response.status}`);
  }
}

/**
 * Standardize source string
 */
function standardizeSource(component) {
  if (typeof component === 'undefined' || !sourceStringMap[component]) {
    return 'Standard Navigation';
  }
  return sourceStringMap[component];
}

/**
 * Standardize source page string
 */
function standardizeSourcePage(pageStr) {
  if (typeof pageStr === 'undefined') return 'Unknown';
  return upper1stChar(pageStr);
}

/**
 * Converts first character to uppercase
 */
export function upper1stChar(str: string): string {
  if (str === '' || str === null) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Map of event types
const eventTypeMap = {
  boxRender: 'RecommendationsRendered',
  itemView: 'ItemView',
  itemTimeSpend: 'ItemTimeSpend',
  collectionView: 'CollectionView',
  collectionTimeSpend: 'CollectionTimeSpend',
  variantAddToCart: 'ProductVariantAddToCart',
  cartTimeSpend: 'CartTimeSpent',
};

// Map of source strings
const sourceStringMap = {
  related: 'Related',
  crosssell: 'CrossSell',
  upsell: 'Upsell',
  boughttogether: 'BoughtTogether',
  youmaylike: 'YouMayLike',
  popular: 'PopularItems',
  recent: 'RecentViews',
  trending: 'Trending',
  newarrival: 'NewArrival',
  featuredcollection: 'FeaturedCollection1',
  featuredcollection1: 'FeaturedCollection1',
  featuredcollection2: 'FeaturedCollection2',
  featuredcollection3: 'FeaturedCollection3',
  featuredcollection4: 'FeaturedCollection4',
  curatedcollectionbox: 'CuratedCollectionBox',
  curatedcollectionpage: 'CuratedCollectionPage',
  external: 'ExternalSource',
  targeted: 'GoogleSmartShopping',
  googlesmartshopping: 'GoogleSmartShopping',
  googlestandardshopping: 'GoogleStandardShopping',
  googlefreelisting: 'GoogleFreeListing',
  manualpick: 'ManualPick',
};
