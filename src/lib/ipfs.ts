
/**
 * Resolves IPFS URLs to a faster gateway if needed.
 * Replaces rate-limited gateways (like Pinata public) with faster ones.
 */
export function resolveIpfsUrl(url: string | undefined | null): string {
  if (!url) return "";

  // List of gateways to try to replace Pinata with
  // const PREFERRED_GATEWAY = "https://cloudflare-ipfs.com/ipfs/";
  // const PREFERRED_GATEWAY = "https://ipfs.io/ipfs/";
  const PREFERRED_GATEWAY = "https://dweb.link/ipfs/";

  if (url.includes("gateway.pinata.cloud/ipfs/")) {
    return url.replace("https://gateway.pinata.cloud/ipfs/", PREFERRED_GATEWAY);
  }

  // If it is a CID (doesn't start with http), prepend gateway
  if (!url.startsWith("http")) {
      // Check if it looks like a CID (starts with Qm or baf)
      if (url.startsWith("Qm") || url.startsWith("baf")) {
          return `${PREFERRED_GATEWAY}${url}`;
      }
      // Depending on usage, might be a relative path, return as is or handle
      return url; 
  }

  return url;
}
