import { handleAction, queryStringValue } from "../_actions";

export default async function handler(request: any, response: any) {
  await handleAction(request, response, {
    GET: (service) => service.metrics(queryStringValue(request, "month"))
  });
}
