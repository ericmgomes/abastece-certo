import { handleAction } from "../_actions";

export default async function handler(request: any, response: any) {
  await handleAction(request, response, {
    GET: (service) => service.listStations(),
    POST: (service, body) => service.createStation(body as Parameters<typeof service.createStation>[0])
  });
}
