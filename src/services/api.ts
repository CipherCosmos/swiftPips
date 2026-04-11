import type { OptionChainResponse, UnderlyingResponse, ExpiryResponse, UserResponse, ClientDetailsResponse, WSSession } from '../types/api';

const BASE_URL = '';

let authToken: string | null = null;

const sanitizeToken = (token: string | null): string | null => {
  if (!token) return null;
  // Remove all occurrences of "Bearer " (case insensitive) and trim
  return token.replace(/^(Bearer\s*)+/gi, '').trim();
};

export function setAuthToken(token: string) {
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) return;
  
  authToken = cleanToken;
  console.log('Token set, length:', cleanToken.length);
  localStorage.setItem('aliceblue_token', cleanToken);
}

export function loadAuthToken(): string | null {
  if (!authToken) {
    const stored = localStorage.getItem('aliceblue_token');
    authToken = sanitizeToken(stored);
    if (authToken && stored !== authToken) {
      localStorage.setItem('aliceblue_token', authToken);
    }
  }
  return authToken;
}

async function fetchAPI<T>(path: string, payload: object = {}, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const token = loadAuthToken();
  if (!token) {
    throw new Error('Authentication token not set');
  }

  console.log(`Using ${method} for ${path}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://ant.aliceblueonline.com/home',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
    body: method === 'POST' ? JSON.stringify(payload) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  return data as T;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('aliceblue_token');
}

export async function getUnderlyings(): Promise<string[]> {
  const response = await fetchAPI<UnderlyingResponse>('/obrest/optionChain/getUnderlying', { exch: 'nse_fo' });
  return response.result[0]?.list_underlying || [];
}

export async function getExpiries(underlying: string): Promise<string[]> {
  const response = await fetchAPI<ExpiryResponse>('/obrest/optionChain/getUnderlyingExp', {
    underlying,
    exch: 'nse_fo'
  });
  return response.result[0]?.underlying_expiry || [];
}

export async function getOptionChain(underlying: string, expiry: string, interval: string = '15'): Promise<OptionChainResponse> {
  return fetchAPI<OptionChainResponse>('/obrest/optionChain/getOptionChain', {
    underlying,
    expiry,
    interval,
    exch: 'nse_fo'
  });
}

export async function getHoldings(): Promise<unknown> {
  return fetchAPI<unknown>('/omk/ho-rest/holdings', {});
}

export async function getPositions(): Promise<unknown> {
  return fetchAPI<unknown>('/omk/ho-rest/positions', {});
}

export async function getOrderHistory(): Promise<unknown> {
  return fetchAPI<unknown>('/omk/ho-rest/orderHistory', {});
}

export async function getUser(): Promise<UserResponse> {
  return fetchAPI<UserResponse>('/omk/client-rest/profile/getUser', {}, 'GET');
}

export async function getClientDetails(): Promise<ClientDetailsResponse> {
  return fetchAPI<ClientDetailsResponse>('/omk/client-rest/profile/getclientdetails', {}, 'GET');
}

export async function getWSSession(forceRefresh: boolean = false): Promise<WSSession> {
  // Always fetch fresh profile info to get a valid, unconsumed susertoken
  const userRes = await getUser();
  const clientRes = await getClientDetails();
  
  const user = userRes.result[0];
  const client = clientRes.result[0];
  
  if (!user || !client) {
    throw new Error('Failed to retrieve session metadata');
  }

  return {
    uid: user.userId || client.userId,
    actid: client.actId || user.userId,
    susertoken: user.key,
    source: 'API' // Switched back to API as it is more standard for data terminals
  };
}