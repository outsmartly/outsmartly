import { Plugin, OutsmartlyEdgeMessageEvent, EdgeMessageBusListener } from '@outsmartly/core';

/**
 * A custom Outsmartly plugin that attaches listeners for various message types
 */
export function limespotPlugin(): Plugin {
  return {
    name: '@outsmartly/plugin-limespot',
    setup: ({ config, messageBus }) => {
      messageBus.on(
        'boxRender',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: `${data.boxKey}RecommendationsRendered`,
          IntData: data.integerData,
          ScreenResolution: data.resolution,
          // Source: standardizeSource(data.referComponent),
          // SourcePage: standardizeSourcePage(data.referPage),
        })),
      );

      messageBus.on(
        'productView',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'ItemView',
          ReferenceIdentifier: data.id,
          ScreenResolution: data.resolution,
          // Source: standardizeSource(data.referComponent),
          // SourcePage: standardizeSourcePage(data.referPage),
        })),
      );

      messageBus.on(
        'productTimeSpend',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'ItemTimeSpend',
          IntData: data.integerData,
          ReferenceIdentifier: data.id,
          ScreenResolution: data.resolution,
          // Source: standardizeSource(data.referComponent),
          // SourcePage: standardizeSourcePage(data.referPage),
        })),
      );

      messageBus.on(
        'collectionView',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'CollectionView',
          ReferenceIdentifier: data.id,
          ScreenResolution: data.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Collection',
        })),
      );

      messageBus.on(
        'collectionTimeSpend',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'CollectionTimeSpend',
          IntData: data.integerData,
          ReferenceIdentifier: data.id,
          ScreenResolution: data.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Unknown',
        })),
      );

      messageBus.on(
        'variantAddToCart',
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'ProductVariantAddToCart',
          IntData: data.integerData,
          ReferenceIdentifier: data.id,
          ScreenResolution: data.resolution,
          // Source: standardizeSource(data.referComponent),
          // SourcePage: standardizeSourcePage(data.referPage),
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
        createMessageListener((data) => ({
          ActivityTime: data.timestamp,
          Event: 'CartTimeSpent',
          IntData: data.integerData,
          ScreenResolution: data.resolution,
          //Source: standardizeSource(data.referComponent),
          //SourcePage: standardizeSourcePage(data.referPage),
        })),
      );
    },
  } as Plugin;
}

// Add overloads on top of what is provided in core.
declare module '@outsmartly/core' {
  // A keyed collection of additional input types (i.e., properties on the
  // events we emit that this Limespot plugin needs to listen for)
  type NewMessageDataByType = {
    boxRender: {
      boxKey: string;
      integerData: number;
      resolution: string;
      timestamp: string;
      // referComponent: string;
      // referPage: string;
    };
    productView: {
      id: string;
      resolution: string;
      timestamp: string;
      // referComponent: string;
      // referPage: string;
    };
    productTimeSpend: {
      id: string;
      integerData: number;
      resolution: string;
      timestamp: string;
      // referComponent: string;
      // referPage: string;
    };
    collectionView: {
      integerData: number;
      id: string;
      resolution: string;
      timestamp: string;
    };
    collectionTimeSpend: {
      integerData: number;
      id: string;
      resolution: string;
      timestamp: string;
    };
    variantAddToCart: {
      integerData: number;
      id: string;
      resolution: string;
      timestamp: string;
      // referComponent: string;
      // referPage: string;
    };
    cartTimeSpend: {
      integerData: number;
      resolution: string;
      timestamp: string;
      // referComponent: string;
      // referPage: string;
    };
  };

  // Get the keys of the above collection
  interface EdgeMessageBus {
    on<T extends keyof NewMessageDataByType>(
      type: T,
      callback: EdgeMessageBusListener<T, NewMessageDataByType[T]>,
    ): this;
  }
}

// Output types (i.e., properties Limespot is expecting for each event)
interface LimespotRecommendationsRendered {
  ActivityTime: string;
  Event: string;
  IntData: number;
  ScreenResolution: string;
  // Source: string;
  // SourcePage: string;
}

interface LimespotItemView {
  ActivityTime: string;
  Event: 'ItemView';
  ReferenceIdentifier: string;
  ScreenResolution: string;
  // Source: string;
  // SourcePage: string;
}

interface LimespotItemTimeSpend {
  ActivityTime: string;
  Event: 'ItemTimeSpend';
  IntData: number;
  ReferenceIdentifier: string;
  ScreenResolution: string;
  // Source: string;
  // SourcePage: string;
}

interface LimespotCollectionView {
  ActivityTime: string;
  Event: 'CollectionView';
  ReferenceIdentifier: string;
  ScreenResolution: string;
  Source: string;
  SourcePage: string;
}

interface LimespotCollectionTimeSpend {
  ActivityTime: string;
  Event: 'CollectionTimeSpend';
  IntData: number;
  ReferenceIdentifier: string;
  ScreenResolution: string;
  Source: string;
  SourcePage: string;
}

interface LimespotVariantAddToCart {
  ActivityTime: string;
  Event: 'ProductVariantAddToCart';
  IntData: number;
  ReferenceIdentifier: string;
  ScreenResolution: string;
  // Source: string;
  // SourcePage: string;
}

interface LimespotCartTimeSpent {
  ActivityTime: string;
  Event: 'CartTimeSpent';
  IntData: number;
  ScreenResolution: string;
  // Source: string;
  // SourcePage: string;
}

// Union of all output types
type LimespotEvent =
  | LimespotRecommendationsRendered
  | LimespotItemView
  | LimespotItemTimeSpend
  | LimespotCollectionView
  | LimespotCollectionTimeSpend
  | LimespotVariantAddToCart
  | LimespotCartTimeSpent;

// An array to hold a batch of activities
const bufferedLimespotEvents: LimespotEvent[] = [];

/**
 * Creates listener functions that return data in the format needed.
 */
function createMessageListener<T extends string, D>(mapper: (data: D) => LimespotEvent) {
  // `event` will be an OutsmartlyEvent
  return async (event: OutsmartlyEdgeMessageEvent<T, D>): Promise<void> => {
    const contextId = event.cookies.get('lsContextID');
    if (!contextId) {
      throw new Error(`Missing contextId`);
    }
    const formattedLimespotEvent = mapper(event.message.data);
    bufferedLimespotEvents.push(formattedLimespotEvent);
    // Hey, just wait for a while, while other messages are added
    await scheduleBatchSend(contextId);
  };
}

let isThrottling = false;

/**
 * Schedules the array/batch of activities to be sent
 */
function scheduleBatchSend(contextId: string): Promise<void> {
  if (isThrottling) {
    return Promise.resolve();
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
async function logActivityBatch(contextID: string, payload: string): Promise<void> {
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
function standardizeSource(component?: string): string {
  if (typeof component === 'undefined' || !sourceStringMap[component]) {
    return 'Standard Navigation';
  }
  return sourceStringMap[component];
}

/**
 * Standardize source page string
 */
function standardizeSourcePage(pageStr: string) {
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

// Map of source strings
const sourceStringMap: { [key: string]: string } = {
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
