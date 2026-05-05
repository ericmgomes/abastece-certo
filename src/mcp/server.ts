import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import express, { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { contextFromBearerToken, supabaseConfig } from "./supabaseAuth";
import { LitroCertoMcpService } from "./litroCertoService";
import { fuels, vehicleTypes } from "../domain";

type ToolExtra = {
  authInfo?: {
    token?: string;
  };
};

const fuelSchema = z.enum(fuels as [typeof fuels[number], ...typeof fuels]);
const vehicleTypeSchema = z.enum(vehicleTypes as [typeof vehicleTypes[number], ...typeof vehicleTypes]);

export function createLitroCertoMcpServer() {
  const server = new McpServer({
    name: "litro-certo",
    version: "0.1.0"
  });

  server.registerTool(
    "listar_veiculos",
    {
      title: "Listar veículos",
      description: "Lista os veículos cadastrados na conta logada."
    },
    async (extra) => json(await (await service(extra)).listVehicles())
  );

  server.registerTool(
    "criar_veiculo",
    {
      title: "Criar veículo",
      description: "Cria um veículo na conta logada.",
      inputSchema: {
        vehicleType: vehicleTypeSchema.optional(),
        brand: z.string().min(1),
        model: z.string().min(1)
      }
    },
    async (input, extra) => json(await (await service(extra)).createVehicle(input))
  );

  server.registerTool(
    "editar_veiculo",
    {
      title: "Editar veículo",
      description: "Edita um veículo existente da conta logada.",
      inputSchema: {
        id: z.string().min(1),
        vehicleType: vehicleTypeSchema.optional(),
        brand: z.string().optional(),
        model: z.string().optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).updateVehicle(input))
  );

  server.registerTool(
    "listar_postos",
    {
      title: "Listar postos",
      description: "Lista postos cadastrados na conta logada."
    },
    async (extra) => json(await (await service(extra)).listStations())
  );

  server.registerTool(
    "criar_posto",
    {
      title: "Criar posto",
      description: "Cria um posto na conta logada.",
      inputSchema: {
        name: z.string().min(1),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().length(2).optional(),
        latitude: z.number(),
        longitude: z.number()
      }
    },
    async (input, extra) => json(await (await service(extra)).createStation(input))
  );

  server.registerTool(
    "editar_posto",
    {
      title: "Editar posto",
      description: "Edita um posto existente da conta logada.",
      inputSchema: {
        id: z.string().min(1),
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().length(2).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).updateStation(input))
  );

  server.registerTool(
    "listar_abastecimentos",
    {
      title: "Listar abastecimentos",
      description: "Lista abastecimentos recentes da conta logada.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).listFuelLogs(input.limit))
  );

  server.registerTool(
    "criar_abastecimento",
    {
      title: "Criar abastecimento",
      description: "Cria um abastecimento na conta logada.",
      inputSchema: {
        carId: z.string().min(1),
        stationId: z.string().min(1),
        fuel: fuelSchema,
        paid: z.number().positive(),
        liters: z.number().positive(),
        odometerKm: z.number().positive().optional(),
        createdAt: z.string().datetime().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).createFuelLog(input))
  );

  server.registerTool(
    "editar_abastecimento",
    {
      title: "Editar abastecimento",
      description: "Edita um abastecimento existente da conta logada.",
      inputSchema: {
        id: z.string().min(1),
        carId: z.string().optional(),
        stationId: z.string().optional(),
        fuel: fuelSchema.optional(),
        paid: z.number().positive().optional(),
        liters: z.number().positive().optional(),
        odometerKm: z.number().positive().optional(),
        createdAt: z.string().datetime().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).updateFuelLog(input))
  );

  server.registerTool(
    "consultar_metricas",
    {
      title: "Consultar métricas",
      description: "Consulta métricas da conta logada. O mês usa formato YYYY-MM.",
      inputSchema: {
        month: z.string().regex(/^\d{4}-\d{2}$/).optional()
      }
    },
    async (input, extra) => json(await (await service(extra)).metrics(input.month))
  );

  return server;
}

export function createHttpApp() {
  const env = process.env as Record<string, string | undefined>;
  const app = createMcpExpressApp({ host: env.MCP_HOST ?? "127.0.0.1" });
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader("Access-Control-Allow-Origin", env.MCP_CORS_ORIGIN ?? "*");
    response.setHeader("Access-Control-Allow-Headers", "authorization,content-type,mcp-session-id");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");

    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }

    next();
  });
  app.use(express.json());

  app.get("/health", (_request: Request, response: Response) => {
    response.json({ ok: true, name: "litro-certo-mcp" });
  });

  app.get("/actions/vehicles", async (request: Request, response: Response) => {
    await action(response, async () => (await serviceFromRequest(request)).listVehicles());
  });

  app.post("/actions/vehicles", async (request: Request, response: Response) => {
    await action(response, async () => (await serviceFromRequest(request)).createVehicle(request.body), 201);
  });

  app.patch("/actions/vehicles/:id", async (request: Request, response: Response) => {
    await action(response, async () =>
      (await serviceFromRequest(request)).updateVehicle({ ...request.body, id: request.params.id })
    );
  });

  app.get("/actions/stations", async (request: Request, response: Response) => {
    await action(response, async () => (await serviceFromRequest(request)).listStations());
  });

  app.post("/actions/stations", async (request: Request, response: Response) => {
    await action(response, async () => (await serviceFromRequest(request)).createStation(request.body), 201);
  });

  app.patch("/actions/stations/:id", async (request: Request, response: Response) => {
    await action(response, async () =>
      (await serviceFromRequest(request)).updateStation({ ...request.body, id: request.params.id })
    );
  });

  app.get("/actions/fuel-logs", async (request: Request, response: Response) => {
    const limit = Number(request.query.limit ?? 30);
    await action(response, async () => (await serviceFromRequest(request)).listFuelLogs(limit));
  });

  app.post("/actions/fuel-logs", async (request: Request, response: Response) => {
    await action(response, async () => (await serviceFromRequest(request)).createFuelLog(request.body), 201);
  });

  app.patch("/actions/fuel-logs/:id", async (request: Request, response: Response) => {
    await action(response, async () =>
      (await serviceFromRequest(request)).updateFuelLog({ ...request.body, id: request.params.id })
    );
  });

  app.get("/actions/metrics", async (request: Request, response: Response) => {
    const month = typeof request.query.month === "string" ? request.query.month : undefined;
    await action(response, async () => (await serviceFromRequest(request)).metrics(month));
  });

  app.get("/.well-known/oauth-protected-resource", (request: Request, response: Response) => {
    const { url } = supabaseConfig();
    const resource = `${request.protocol}://${request.get("host")}/mcp`;
    response.json({
      resource,
      authorization_servers: [`${url}/auth/v1`],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"]
    });
  });

  app.all("/mcp", async (request: Request, response: Response) => {
    const token = bearerToken(request.headers.authorization);
    if (!token) {
      response.status(401).json({
        error: "unauthorized",
        error_description: "Envie Authorization: Bearer <Supabase access token>."
      });
      return;
    }

    try {
      const context = await contextFromBearerToken(token);
      (request as typeof request & { auth?: { token: string; clientId: string; scopes: string[] } }).auth = {
        token,
        clientId: context.ownerId,
        scopes: ["openid", "email", "profile"]
      };

      const server = createLitroCertoMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
      response.on("close", () => {
        void server.close();
      });
    } catch (error) {
      response.status(401).json({
        error: "unauthorized",
        error_description: error instanceof Error ? error.message : "Token inválido."
      });
    }
  });

  return app;
}

async function service(extra: ToolExtra) {
  const token = extra.authInfo?.token;
  if (!token) {
    throw new Error("Operação exige login OAuth.");
  }

  return new LitroCertoMcpService(await contextFromBearerToken(token));
}

async function serviceFromRequest(request: Request) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    throw new AuthError("Envie Authorization: Bearer <Supabase access token>.");
  }

  return new LitroCertoMcpService(await contextFromBearerToken(token));
}

async function action(response: Response, handler: () => Promise<unknown>, successStatus = 200) {
  try {
    response.status(successStatus).json(await handler());
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({
        error: "unauthorized",
        message: error.message
      });
      return;
    }

    response.status(400).json({
      error: "bad_request",
      message: error instanceof Error ? error.message : "Não foi possível executar a ação."
    });
  }
}

class AuthError extends Error {}

function json(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function bearerToken(value?: string) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
