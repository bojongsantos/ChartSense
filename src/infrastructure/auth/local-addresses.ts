import "server-only";

import { networkInterfaces } from "node:os";

/**
 * IPv4 addresses this machine answers on, excluding loopback.
 *
 * Used only to widen the development trusted-origin list to the "Network" URL
 * `next dev` prints. Read from the interfaces rather than configured by hand
 * because the address changes with the network the machine happens to join,
 * and a stale value fails in a way that reads like a security error.
 */
export function localIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!addresses.includes(entry.address)) addresses.push(entry.address);
    }
  }
  return addresses;
}
