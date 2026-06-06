const http = require("http");

async function main() {
  require("tsx/cjs");
  const handlerModule = require("../api/assistant.ts");
  const handler = handlerModule.default;

  const server = http.createServer(async (request, response) => {
    response.status = (statusCode) => {
      response.statusCode = statusCode;
      return response;
    };
    response.json = (body) => {
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(body));
    };

    if (request.url?.startsWith("/api/assistant")) {
      await handler(request, response);
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(8087, () => {
    console.log("LitroCerto assistant API listening on http://localhost:8087");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
