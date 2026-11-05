import { createHmac, randomBytes } from "crypto";

/**
 * OAuth 1.0a-signering til Magento 2's REST API (samme metode som kundeservice-appen).
 * Bruges når alle fire integrationsnøgler er sat; så behøver Magento ikke at tillade
 * "standalone Bearer tokens".
 */
export type OAuthCredentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function oauthHeader(
  method: string,
  url: string,
  creds: OAuthCredentials,
  query: Record<string, string> = {},
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_token: creds.accessToken,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };
  const all = { ...query, ...oauth };
  const paramString = Object.keys(all)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(all[k])}`)
    .join("&");
  const base = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join("&");
  const key = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.accessTokenSecret)}`;
  const signature = createHmac("sha256", key).update(base).digest("base64");

  const header: Record<string, string> = { ...oauth, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(header)
      .map((k) => `${percentEncode(k)}="${percentEncode(header[k])}"`)
      .join(", ")
  );
}
