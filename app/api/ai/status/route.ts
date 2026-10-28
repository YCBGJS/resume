export function GET() {
  return Response.json({
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  });
}
