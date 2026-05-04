# Litro Certo no Custom GPT via Actions

GPT Actions acessam APIs REST descritas por OpenAPI. Elas nao chamam um MCP Server diretamente, entao o servidor do Litro Certo tambem expoe endpoints REST em `/actions/*`.

## Arquivos

- `docs/openapi-actions.yaml`: schema para colar na Action do Custom GPT.
- `public/openapi-actions.yaml`: schema publico servido pelo deploy.
- `api/actions/*`: endpoints REST publicos no Vercel usando a mesma autorizacao Supabase.
- `api/oauth/*`: proxy OAuth no dominio do app para compatibilidade com GPT Actions.
- `src/mcp/server.ts`: endpoints REST locais e endpoint MCP usando a mesma autorizacao Supabase.

## URL publica do schema

Depois do deploy no Vercel:

```text
https://abastece-certo.vercel.app/openapi-actions.yaml
```

## Endpoints

Todos exigem `Authorization: Bearer <access_token_supabase>`.

- `GET /api/actions/vehicles`
- `POST /api/actions/vehicles`
- `PATCH /api/actions/vehicles/{id}`
- `GET /api/actions/stations`
- `POST /api/actions/stations`
- `PATCH /api/actions/stations/{id}`
- `GET /api/actions/fuel-logs`
- `POST /api/actions/fuel-logs`
- `PATCH /api/actions/fuel-logs/{id}`
- `GET /api/actions/metrics?month=YYYY-MM`

## Configuracao no Custom GPT

1. Abra o Builder do Custom GPT.
2. Va em `Configure` > `Actions`.
3. Crie uma nova Action.
4. Cole o conteudo de `docs/openapi-actions.yaml`.
5. Em `Authentication`, escolha `OAuth`.
6. Use as credenciais OAuth do projeto Supabase.

Campos sugeridos:

- Authorization URL: `https://abastece-certo.vercel.app/api/oauth/authorize`
- Token URL: `https://abastece-certo.vercel.app/api/oauth/token`
- Scope: `openid email profile`

Depois que o GPT Builder mostrar a callback URL da Action, adicione essa URL no Supabase em `Authentication` > `URL Configuration` > `Redirect URLs`.

## Configuracao no Supabase OAuth Server

Em `Authentication` > `URL Configuration`:

- Site URL: `https://abastece-certo.vercel.app`

Em `Authentication` > `OAuth Server`:

- Authorization Path: `/oauth/consent`

O app implementa essa tela em `/oauth/consent?authorization_id=...`. Ela mostra o consentimento, chama `supabase.auth.oauth.approveAuthorization(...)` ou `denyAuthorization(...)` e devolve a pessoa para o ChatGPT.

## Observacao importante sobre dominio

As notas oficiais de producao de GPT Actions dizem que, com excecao de alguns provedores grandes, os dominios do OAuth devem ser os mesmos dominios dos endpoints principais da API. Por isso o Litro Certo expoe proxies no Vercel:

- `https://abastece-certo.vercel.app/api/oauth/authorize`
- `https://abastece-certo.vercel.app/api/oauth/token`

Esses endpoints encaminham o fluxo para o OAuth Server do Supabase, mas mantem o dominio raiz igual ao dominio da API.

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
