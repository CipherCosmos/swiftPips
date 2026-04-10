import type { OptionChainResponse, UnderlyingResponse, ExpiryResponse } from '../types/api';

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

async function fetchAPI<T>(path: string, payload: object): Promise<T> {
  const token = loadAuthToken();
  if (!token) {
    throw new Error('Authentication token not set');
  }

  console.log('Using token starting with:', token.substring(0, 15) + '...');

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
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
    body: JSON.stringify(payload),
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

export async function getOptionChain(underlying: string, expiry: string): Promise<OptionChainResponse> {
  return fetchAPI<OptionChainResponse>('/obrest/optionChain/getOptionChain', {
    underlying,
    expiry,
    interval: '15',
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