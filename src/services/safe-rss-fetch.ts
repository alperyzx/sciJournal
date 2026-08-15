import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function isForbiddenIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [a, b, c] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function isForbiddenIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff')) {
    return true;
  }

  // IPv4-mapped IPv6 addresses must obey the same private/reserved-range policy.
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isForbiddenIpv4(mappedIpv4) : false;
}

function isForbiddenAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isForbiddenIpv4(address);
  if (family === 6) return isForbiddenIpv6(address);
  return true;
}

export function parseAndValidateFeedUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Feed URL must be a valid absolute HTTPS URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Feed URL must use HTTPS.');
  }

  if (url.username || url.password) {
    throw new Error('Feed URL must not include a username or password.');
  }

  if (!url.hostname) {
    throw new Error('Feed URL must include a hostname.');
  }

  return url;
}

async function assertPublicDestination(url: URL): Promise<void> {
  const hostname = url.hostname;

  if (isIP(hostname)) {
    if (isForbiddenAddress(hostname)) {
      throw new Error('Feed URL must not target a private, loopback, link-local, multicast, or reserved IP address.');
    }
    return;
  }

  let records: Awaited<ReturnType<typeof lookup>>[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('Feed hostname could not be resolved.');
  }

  if (records.length === 0 || records.some((record) => isForbiddenAddress(record.address))) {
    throw new Error('Feed hostname resolves to a private, loopback, link-local, multicast, or reserved IP address.');
  }
}

async function readLimitedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(`RSS feed exceeds the ${MAX_RESPONSE_BYTES / 1024 / 1024} MB response limit.`);
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        throw new Error(`RSS feed exceeds the ${MAX_RESPONSE_BYTES / 1024 / 1024} MB response limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export async function fetchSafeRssFeed(feedUrl: string): Promise<string> {
  let url = parseAndValidateFeedUrl(feedUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicDestination(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'user-agent': 'SciJournal Digest' },
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`RSS feed request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
      }
      throw new Error('RSS feed request failed.');
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('RSS feed redirect did not provide a destination.');
      if (redirectCount === MAX_REDIRECTS) throw new Error(`RSS feed exceeded the ${MAX_REDIRECTS} redirect limit.`);
      url = parseAndValidateFeedUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    return readLimitedBody(response);
  }

  throw new Error('RSS feed request failed.');
}
