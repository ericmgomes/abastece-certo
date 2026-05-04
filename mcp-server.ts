import { createHttpApp } from "./src/mcp/server";

const env = process.env as Record<string, string | undefined>;
const port = Number(env.PORT ?? env.MCP_PORT ?? 3333);
const host = env.MCP_HOST ?? "127.0.0.1";
const app = createHttpApp();

app.listen(port, host, () => {
  console.log(`Litro Certo MCP Server em http://${host}:${port}/mcp`);
});
