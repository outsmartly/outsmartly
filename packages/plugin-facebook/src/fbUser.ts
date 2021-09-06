import { OutsmartlyEdgeMessageEvent } from '@outsmartly/core';
import { hash } from './utils';
import { FBP_COOKIE_KEY, FBC_COOKIE_KEY } from './fbcookies';

export interface FbCustomerInformation {
  client_user_agent: string;
  client_ip_address: string;
  external_id: ArrayBuffer;
  fbp: string | undefined;
  fbc?: string | undefined;
  em?: ArrayBuffer;
  ph?: ArrayBuffer;
  ct?: ArrayBuffer;
}

export interface CustomerData {
  email?: string;
  phone?: string;
}

/**
 * Extract user data to be passed to facebook
 */
export async function getUserData(
  event: OutsmartlyEdgeMessageEvent<string, unknown>,
  customer_data: CustomerData,
): Promise<FbCustomerInformation> {
  const { visitor, cookies } = event;
  const { id, ipAddress, city /* userAgent */ } = visitor;
  const { email, phone } = customer_data;

  const eid: ArrayBuffer = await hash(id);

  const data: FbCustomerInformation = {
    client_user_agent: /* userAgent */ '',
    client_ip_address: ipAddress,
    fbp: cookies.get(FBP_COOKIE_KEY) || '',
    fbc: cookies.get(FBC_COOKIE_KEY) || '',
    external_id: eid,
  };

  if (city) {
    data.ct = await hash(city);
  }

  if (email) {
    data.em = await hash(email);
  }

  if (phone) {
    data.ph = await hash(phone);
  }

  return data;
}
