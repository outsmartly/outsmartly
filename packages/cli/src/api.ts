import fetch, { Response, Headers, RequestInit } from 'node-fetch';
import { AbortSignal } from 'node-fetch/externals';

const origin = process.env.OUTSMARTLY_API_ORIGIN ?? 'https://api.edgebailey.com';

export class APIError extends Error {
  constructor(public response: Response, public json: any) {
    super('API error');
    this.name = 'APIError';
  }
}

export interface APIResponseBody<T> {
  success: boolean;
  errors: string[];
  result: T;
}

declare module 'node-fetch' {
  interface Response {
    // :'( node-fetch is wrong
    json<R>(): Promise<R>;
  }
}

export interface APIFetchOptions {
  cliVersion: string;
  bearerToken?: string;
  signal?: AbortSignal;
  init?: RequestInit;
}

export async function apiFetch<R>(url: string, options: APIFetchOptions): Promise<R> {
  const { bearerToken, cliVersion, signal = null, init } = options;
  const headers = new Headers(init?.headers);
  const platform = `(${process.platform}; ${process.arch})`;
  const system = `NodeJS/${process.version.slice(1)} ${platform}`;
  const userAgent = `Outsmartly-CLI/${cliVersion} (+abuse@outsmartly.com) ${system}`;

  const resp = await fetch(url, {
    ...init,
    signal,
    headers: {
      accept: 'application/vnd.outsmartly.v1+json',
      authorization: `Bearer ${bearerToken}`,
      'content-type': 'application/json',
      'user-agent': userAgent,
      ...Object.fromEntries(headers),
    },
  });

  // If there's an error we'll want to show the text as-is
  // so we're going to parse JSON ourselves.
  const text = await resp.text();
  let json;

  try {
    json = JSON.parse(text) as APIResponseBody<R>;
  } catch (e: any) {
    // Thus far this only happens when Cloudflare itself is having issues in some form or another.
    // In general, it's not a good sign since we should *always* get JSON even when there are errors
    // as long as they were handled by the API server.
    if (text.trim().startsWith('<!DOCTYPE html>') && !process.env.OUTSMARTLY_INTERNAL_DEBUG) {
      throw new Error(
        `API request to ${url} failed. Malformed response from server. ${e.message}\n HTTP Status: ${resp.status}\n\n <UNEXPECTED_SERVER_RESPONSE_HTML>`,
      );
    }
    throw new Error(
      `API request to ${url} failed. Malformed response from server. ${e.message}\n HTTP Status: ${resp.status}\n\n${text}`,
    );
  }

  if (!resp.ok || json.success === false) {
    throw new APIError(resp, json);
  }

  return json.result;
}

export interface Site {
  id: string;
  host: string;
  name: string;
  configRaw: string;
  workerId: string;
  createdAt: string;
  updatedAt: string;
  userIds: string[];
}

export interface PostSite {
  host: string;
  name: string;
  configRaw: string;
  analysis: Analysis;
  userIds: [];
}

export async function postSite(
  site: PostSite,
  options: {
    bearerToken: string;
    cliVersion: string;
    signal?: AbortSignal;
  },
): Promise<Site> {
  return await apiFetch(`${origin}/sites`, {
    ...options,
    init: {
      method: 'POST',
      body: JSON.stringify(site),
    },
  });
}

export interface PropertyPathsTrieNode {
  key: string;
  sliceIds: string[];
  properties: {
    [key: string]: PropertyPathsTrieNode;
  };
}

export interface SliceMeta {
  instructionsKeyPath: string[];
  propertyKeyPath: string[];
}

export interface ComponentAnalysis {
  scope: string;
  filename: string;
  propertyPathsTrie: PropertyPathsTrieNode;
  sliceMetaById: {
    [key: string]: SliceMeta;
  };
  moduleThunkRaw: string;
}

export interface Analysis {
  components: { [key: string]: ComponentAnalysis };
  vfs: { [key: string]: string };
}
export interface CompileTimeArtifactsByOrigin {
  [key: string]: {
    analysis: Analysis;
  };
}
export interface PatchSite {
  host: string;
  configRaw?: string;
  analysis?: Analysis;
  compileTimeArtifactsByOrigin?: CompileTimeArtifactsByOrigin;
}

export async function patchSite(
  sitePatch: PatchSite,
  options: {
    bearerToken: string;
    cliVersion: string;
    signal?: AbortSignal;
  },
): Promise<Site> {
  const { host } = sitePatch;

  return await apiFetch(`${origin}/sites/${host}`, {
    ...options,
    init: {
      method: 'PATCH',
      body: JSON.stringify(sitePatch),
    },
  });
}
