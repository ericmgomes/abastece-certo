import { handleAction, queryStringValue } from "../_actions";

export default async function handler(request: any, response: any) {
  await handleAction(request, response, {
    GET: (service) => service.listFuelLogs(Number(queryStringValue(request, "limit") ?? 30)),
    POST: (service, body) => service.createFuelLog(body as Parameters<typeof service.createFuelLog>[0])
  });
}
