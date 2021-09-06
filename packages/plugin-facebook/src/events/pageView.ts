const FB_PAGE_VIEW: string = 'PageView';
import { sendFbEvent } from '../fbevents';
import { OutsmartlyEdgeMessageEvent } from '@outsmartly/core';

interface PageViewData {
  event_source_url: string;
  customer_data: any;
  custom_data: any;
}
type PageViewMessageEvent = OutsmartlyEdgeMessageEvent<
  typeof FB_PAGE_VIEW,
  PageViewData
>;
export async function pageView(event: PageViewMessageEvent) {
  const { message } = event;
  const { event_source_url, customer_data, custom_data } = message.data;

  sendFbEvent({
    event,
    event_name: FB_PAGE_VIEW,
    event_source_url,
    customer_data,
    custom_data,
  });
}
