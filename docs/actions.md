# LitroCerto no Custom GPT via Actions

GPT Actions acessam APIs REST descritas por OpenAPI. Elas nao chamam um MCP Server diretamente, entao o LitroCerto expoe endpoints REST em `/api/actions/*`.

## Arquivos

- `docs/openapi-actions.yaml`: schema para colar na Action do Custom GPT.
- `public/openapi-actions.yaml`: schema publico servido pelo deploy.
- `api/actions/*`: endpoints REST publicos no Vercel.
- `api/oauth/*`: OAuth proprio do LitroCerto para compatibilidade com GPT Actions.
- `src/mcp/customOAuthToken.ts`: tokens assinados usados pelo OAuth proprio.

## URL publica do schema

Depois do deploy no Vercel:

```text
https://app.litrocerto.com.br/openapi-actions.yaml
```

## Endpoints

Todos exigem `Authorization: Bearer <access_token_litrocerto>`.

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
3. Crie ou edite uma Action.
4. Importe `https://app.litrocerto.com.br/openapi-actions.yaml`.
5. Em `Authentication`, escolha `OAuth`.

Campos:

- Client ID: mesmo valor de `LITROCERTO_OAUTH_CLIENT_ID`.
- Client Secret: mesmo valor de `LITROCERTO_OAUTH_CLIENT_SECRET`.
- Authorization URL: `https://app.litrocerto.com.br/api/oauth/authorize`
- Token URL: `https://app.litrocerto.com.br/api/oauth/token`
- Scope: `openid email profile`
- Token Exchange Method: `Basic authorization header`

## Variaveis no Vercel

Configure no projeto Vercel:

```text
LITROCERTO_OAUTH_CLIENT_ID=lc_8F3kP2vX9rM4Q1tW6yZ
LITROCERTO_OAUTH_CLIENT_SECRET=<um segredo forte igual ao usado no Custom GPT>
LITROCERTO_OAUTH_SECRET=<segredo forte para assinar tokens do LitroCerto>
```

O `LITROCERTO_OAUTH_SECRET` nao aparece no Custom GPT. Ele serve apenas para o backend assinar e validar os tokens emitidos pelo LitroCerto.

## Fluxo OAuth proprio

1. ChatGPT abre `/api/oauth/authorize`.
2. O endpoint redireciona para `/oauth/consent` preservando `client_id`, `redirect_uri`, `state` e `scope`.
3. O app pede login com Supabase se a pessoa ainda nao estiver logada.
4. A pessoa clica em `Autorizar`.
5. O app chama `/api/oauth/approve` com o access token Supabase da sessao.
6. O backend valida o usuario no Supabase e gera um `code` curto.
7. ChatGPT chama `/api/oauth/token`.
8. O backend troca o `code` por um bearer token LitroCerto.
9. As Actions usam esse bearer token, que internamente e mapeado para a conta Supabase da pessoa.

## Testes rapidos

Abra:

```text
https://app.litrocerto.com.br/api/oauth/authorize?response_type=code&client_id=lc_8F3kP2vX9rM4Q1tW6yZ&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Fg-9461ce0926db2c332be7b7d233b1d2e4320f42c9%2Foauth%2Fcallback&state=teste&scope=openid%20email%20profile
```

O esperado e abrir `/oauth/consent`, pedir login se necessario e depois mostrar `Autorizar acesso`.
