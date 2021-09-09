import { EdgeMessageBus, OutsmartlyEdgeMessageEvent } from '@outsmartly/core';
import { FbCustomerInformation, CustomerData, getUserData } from './fbuser';
import { configure } from './events';

export interface ConfigureFbEvents {
  messageBus: EdgeMessageBus;
  options: Options;
}

export interface Options {
  ACCESS_TOKEN: string;
  PIXEL_ID: string;
  FB_TEST_EVENT?: boolean;
  TEST_EVENT_CODE?: string;
}

const configs: Options = {
  ACCESS_TOKEN: '',
  PIXEL_ID: '',
  FB_TEST_EVENT: false,
  TEST_EVENT_CODE: '',
};

export function setupFbEvents({
  messageBus,
  options,
}: ConfigureFbEvents): void {
  configs.ACCESS_TOKEN = options.ACCESS_TOKEN || '';
  configs.PIXEL_ID = options.PIXEL_ID || '';
  configs.FB_TEST_EVENT = options.FB_TEST_EVENT || false;
  configs.TEST_EVENT_CODE = options.TEST_EVENT_CODE || '';

  configure(messageBus);
}

interface CustomData {
  currency?: string;
}

export interface TrackFbEvent {
  event: OutsmartlyEdgeMessageEvent<string, unknown>;
  event_name: string;
  event_source_url: string;
  customer_data?: CustomerData;
  custom_data?: CustomData;
}

/**
 * Track facebook event
 * @param event
 * @param event_name
 */
export async function sendFbEvent({
  event,
  event_name,
  event_source_url,
  customer_data = {},
  custom_data = {},
}: TrackFbEvent): Promise<void> {
  const event_time: number = Math.floor(Date.now() / 1000);
  const action_source: string = 'website';
  const user_data: FbCustomerInformation = await getUserData(
    event,
    customer_data,
  );

  const payload: FacebookEventData = {
    data: [
      {
        event_name,
        event_time,
        action_source,
        event_source_url,
        user_data,
        custom_data,
      },
    ],
    access_token: configs.ACCESS_TOKEN,
  };

  /**
   * Check if FB test events are enabled
   * Then add fb test event code to see fb test events
   */
  if (configs.FB_TEST_EVENT) {
    payload.test_event_code = configs.TEST_EVENT_CODE;
  }

  await postDataToFb(payload);
}

interface FacebookEventData {
  data: [
    {
      event_name: string;
      event_time: number;
      action_source: string;
      event_source_url: string;
      user_data: FbCustomerInformation;
      custom_data?: unknown;
    },
  ];
  access_token: string;
  test_event_code?: string;
}

/**
 * Post data to Facebook API
 */
async function postDataToFb(data: FacebookEventData) {
  const API_VERSION = 'v11.0';
  const PIXEL_ID = configs.PIXEL_ID || '';
  const API_URL: string = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json;',
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `@outsmartly/plugin-facebook: postDataToFb() received ${response.status} response:\n${text}`,
    );
  }
}
