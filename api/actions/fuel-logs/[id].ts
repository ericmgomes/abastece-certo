import { handleAction, idFromRequest } from "../../_actions";

export default async function handler(request: any, response: any) {
  await handleAction(request, response, {
    PATCH: (service, body) => service.updateFuelLog({ ...(body as object), id: idFromRequest(request) ?? "" })
  });
}
