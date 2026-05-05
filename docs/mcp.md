# Litro Certo MCP Server

O servidor MCP expõe operações do app para MCP Clients usando Streamable HTTP.

## Rodar localmente

```bash
npm run mcp
```

Endpoint MCP:

```text
http://127.0.0.1:3333/mcp
```

Health check:

```text
http://127.0.0.1:3333/health
```

## Claude Custom Connector

Depois de publicar na Vercel, preencha no Claude:

```text
Nome: LitroCerto
URL do servidor MCP remoto: https://litrocerto.com.br/mcp
ID do Cliente OAuth: lc_8F3kP2vX9rM4Q1tW6yZ
Client Secret OAuth: Y7nD4sL0pQ9xV2kF6cR1wT8mH3Z
```

O endpoint remoto usa Streamable HTTP e também publica discovery OAuth em:

```text
https://litrocerto.com.br/.well-known/oauth-protected-resource/mcp
https://litrocerto.com.br/.well-known/oauth-authorization-server
```

## Autenticação

O MCP Server exige:

```http
Authorization: Bearer <litrocerto_oauth_access_token>
```

Esse token é emitido pelo OAuth do LitroCerto e carrega, internamente, o token Supabase da pessoa logada. O servidor valida o token com Supabase e executa todas as queries usando a sessão da própria pessoa. Assim:

- não usa `service_role`;
- respeita RLS;
- cada usuário só acessa linhas onde `owner_id = auth.uid()`.

Também existe metadata básica em:

```text
/.well-known/oauth-protected-resource
```

Ela aponta o OAuth do LitroCerto como authorization server.

## Tools

- `listar_veiculos`
- `criar_veiculo`
- `editar_veiculo`
- `listar_postos`
- `criar_posto`
- `editar_posto`
- `listar_abastecimentos`
- `criar_abastecimento`
- `editar_abastecimento`
- `consultar_metricas`

## Observações

O MCP Client precisa conseguir fazer OAuth authorization code e enviar o `access_token` no header `Authorization`. Claude Custom Connector faz esse fluxo usando os campos de OAuth configurados na tela.
