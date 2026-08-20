export async function GET() {
  return Response.json({
    status: "ok",
    service: "liara-docs-copilot",
  });
}
