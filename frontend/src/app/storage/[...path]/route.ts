export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  const bucket = process.env.S3_PUBLIC_BUCKET ?? "goodtribes-public";
  const key = path.join("/");
  const url = `${endpoint}/${bucket}/${key}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!res.ok) {
    return new Response("Not found", { status: res.status });
  }

  const headers = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(res.body, { status: 200, headers });
}
