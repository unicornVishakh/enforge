/**
 * BRENDA wrapper.
 *
 * If BRENDA_EMAIL and BRENDA_PASSWORD_HASH env vars are set we *would* hit
 * the SOAP endpoint at https://www.brenda-enzymes.org/soap/brenda_zeep.wsdl
 * — but BRENDA's official client is a Python `zeep` SOAP client, and a
 * production-quality Node.js SOAP integration is out of scope for this
 * hackathon submission. The cached snapshot below covers the same data
 * surface (kinetics, organism, EC) for the reactions our demo needs.
 *
 * If you hold credentials and want live access, hand-roll the SOAP envelope
 * with `getKmValue(ec, substrate)` etc. — see brenda-enzymes.org/soap_clients.
 */

import {
  BRENDA_SNAPSHOT,
  searchBRENDASnapshot,
  type BRENDAEntry,
  type BRENDASearchInput,
} from "./brenda-snapshot";

export type { BRENDAEntry, BRENDASearchInput };

export interface BRENDAResult {
  source: "live" | "snapshot";
  entries: BRENDAEntry[];
  total_in_snapshot: number;
}

export async function searchBRENDA(
  input: BRENDASearchInput,
): Promise<BRENDAResult> {
  const haveLiveCreds = !!(
    process.env.BRENDA_EMAIL && process.env.BRENDA_PASSWORD_HASH
  );
  if (haveLiveCreds) {
    // Live SOAP not implemented — fall through to snapshot but mark live
    // attempted. (See module header.)
    console.warn(
      "[brenda] live credentials detected but SOAP client is not implemented; using cached snapshot",
    );
  }
  return {
    source: "snapshot",
    entries: searchBRENDASnapshot(input),
    total_in_snapshot: BRENDA_SNAPSHOT.length,
  };
}
