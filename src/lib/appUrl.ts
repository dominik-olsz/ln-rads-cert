// Canonical public app origin used for auth email links.
// The Lovable preview host sits behind a login gate, so links built from it
// bounce users to the Lovable login screen. Always use the public domain.
const CANONICAL_ORIGIN = "https://cert.lnrads.com";

export const appOrigin = (): string => {
  if (typeof window === "undefined") return CANONICAL_ORIGIN;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  return CANONICAL_ORIGIN;
};

export const appUrl = (path = "/"): string =>
  `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
