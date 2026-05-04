# Litro Certo no Custom GPT via Actions

GPT Actions acessam APIs REST descritas por OpenAPI. Elas nao chamam um MCP Server diretamente, entao o servidor do Litro Certo tambem expoe endpoints REST em `/actions/*`.

## Arquivos

- `docs/openapi-actions.yaml`: schema para colar na Action do Custom GPT.
- `public/openapi-actions.yaml`: schema publico servido pelo deploy.
- `src/mcp/server.ts`: endpoints REST e endpoint MCP usando a mesma autorizacao Supabase.

## URL publica do schema

Depois do deploy no Vercel:

```text
https://abastece-certo.vercel.app/openapi-actions.yaml
```

## Endpoints

Todos exigem `Authorization: Bearer <access_token_supabase>`.

- `GET /actions/vehicles`
- `POST /actions/vehicles`
- `PATCH /actions/vehicles/{id}`
- `GET /actions/stations`
- `POST /actions/stations`
- `PATCH /actions/stations/{id}`
- `GET /actions/fuel-logs`
- `POST /actions/fuel-logs`
- `PATCH /actions/fuel-logs/{id}`
- `GET /actions/metrics?month=YYYY-MM`

## Configuracao no Custom GPT

1. Abra o Builder do Custom GPT.
2. Va em `Configure` > `Actions`.
3. Crie uma nova Action.
4. Cole o conteudo de `docs/openapi-actions.yaml`.
5. Em `Authentication`, escolha `OAuth`.
6. Use as credenciais OAuth do projeto Supabase.

Campos sugeridos:

- Authorization URL: `https://ffqykwpkzofkbnvtbfsn.supabase.co/auth/v1/authorize`
- Token URL: `https://ffqykwpkzofkbnvtbfsn.supabase.co/auth/v1/token`
- Scope: `openid email profile`

Depois que o GPT Builder mostrar a callback URL da Action, adicione essa URL no Supabase em `Authentication` > `URL Configuration` > `Redirect URLs`.

## Observacao importante sobre dominio

As notas oficiais de producao de GPT Actions dizem que, com excecao de alguns provedores grandes, os dominios do OAuth devem ser os mesmos dominios dos endpoints principais da API. Como os endpoints do Litro Certo ficam no Vercel e o OAuth hoje fica no dominio do Supabase, pode ser necessario criar endpoints proxy no proprio dominio do app, por exemplo:

- `https://abastece-certo.vercel.app/oauth/authorize`
- `https://abastece-certo.vercel.app/oauth/token`

Esses endpoints apenas encaminhariam o fluxo para o Supabase. O schema atual ja deixa as Actions prontas; se o Builder recusar o dominio do Supabase no OAuth, esse proxy e o proximo passo.

## Testes rapidos

Com o servidor local rodando:

```bash
npm run mcp
```

Teste a API REST com um token Supabase real:

```bash
curl http://127.0.0.1:3333/actions/vehicles \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

Para validar autorizacao, teste com dois usuarios diferentes. Cada token deve listar apenas veiculos, postos e abastecimentos do proprio usuario.
