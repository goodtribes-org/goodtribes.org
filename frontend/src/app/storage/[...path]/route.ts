export const dynamic = "force-dynamic";

// No CDN sits in front of this route yet — every byte still flows
// frontend-pod -> MinIO -> client on every request (a known scaling gap,
// see CLAUDE.md; actually provisioning one needs DNS/CDN-vendor access this
// session doesn't have). Forwarding MinIO's ETag/Last-Modified and honoring
// the client's conditional-request headers at least gets a real 304 (no
// body) on unchanged assets today, and makes whichever CDN eventually sits
// in front of this able to revalidate cheaply instead of always re-fetching
// the full object from origin.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  const bucket = process.env.S3_PUBLIC_BUCKET ?? "goodtribes-public";
  const key = path.join("/");
  const url = `${endpoint}/${bucket}/${key}`;

  const conditionalHeaders: Record<string, string> = {};
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch) conditionalHeaders["if-none-match"] = ifNoneMatch;
  const ifModifiedSince = req.headers.get("if-modified-since");
  if (ifModifiedSince) conditionalHeaders["if-modified-since"] = ifModifiedSince;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", headers: conditionalHeaders });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (res.status === 304) {
    const headers = new Headers();
    headers.set("cache-control", "public, max-age=31536000, immutable");
    const etag = res.headers.get("etag");
    if (etag) headers.set("etag", etag);
    return new Response(null, { status: 304, headers });
  }

  if (!res.ok) {
    return new Response("Not found", { status: res.status });
  }

  const headers = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const etag = res.headers.get("etag");
  if (etag) headers.set("etag", etag);
  const lastModified = res.headers.get("last-modified");
  if (lastModified) headers.set("last-modified", lastModified);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(res.body, { status: 200, headers });
}
