import { handleAction } from "../_actions";

export default async function handler(request: any, response: any) {
  await handleAction(request, response, {
    GET: (service) => service.listVehicles(),
    POST: (service, body) => service.createVehicle(body as Parameters<typeof service.createVehicle>[0])
  });
}
