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

## Autenticação

O MCP Server exige:

```http
Authorization: Bearer <supabase_access_token>
```

Esse token deve ser obtido pelo login OAuth do Supabase Auth, por exemplo Google OAuth. O servidor valida o token com Supabase e executa todas as queries usando o próprio Bearer token recebido. Assim:

- não usa `service_role`;
- respeita RLS;
- cada usuário só acessa linhas onde `owner_id = auth.uid()`.

Também existe metadata básica em:

```text
/.well-known/oauth-protected-resource
```

Ela aponta o Supabase Auth como authorization server.

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

O MCP Client precisa conseguir fazer OAuth com Supabase e enviar o `access_token` no header `Authorization`. Se o cliente MCP não suportar OAuth direto com Supabase, o caminho mais simples é criar uma pequena tela/rota de conexão que faz login e entrega o token ao client conforme o fluxo que ele suportar.
