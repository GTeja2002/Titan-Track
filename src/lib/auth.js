/* ---------------- lib/auth.js ---------------- */

/** Decodes a Google Identity Services JWT credential (payload only, no signature
 *  verification) to read the signed-in email. Fine for a local/no-backend app —
 *  a real production backend should verify the signature server-side instead. */
export function decodeGoogleCredential(jwt) {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
