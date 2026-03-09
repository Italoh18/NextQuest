# Como Corrigir o Erro 405 e Configurar o Deploy na Cloudflare

O erro **405 Method Not Allowed** ocorre porque o Cloudflare Pages, por padrão, serve apenas arquivos estáticos. Quando você faz um `POST` para `/api/auth/login`, o Cloudflare não encontra um backend e tenta servir o arquivo estático (ou redireciona para o `index.html`), o que resulta no erro 405.

## Estrutura de Deploy Correta

Para que o backend funcione na Cloudflare, você deve usar **Cloudflare Pages Functions**.

### 1. Pasta `functions`
Já criei a pasta `functions/api/[[path]].ts`. Esta pasta é onde o Cloudflare procura pelo seu backend.
- O arquivo `[[path]].ts` captura todas as requisições para `/api/*`.
- Você precisará migrar a lógica do seu `server.ts` para dentro desta pasta, usando a sintaxe do Cloudflare Workers (ou usando o Hono, que eu já instalei para você).

### 2. Banco de Dados D1
O `better-sqlite3` funciona apenas localmente. Para a Cloudflare, você deve usar o **D1**.
- Crie um banco D1 no painel da Cloudflare.
- Execute o seu `schema.sql` no D1: `wrangler d1 execute nextquest-db --file=./schema.sql`
- Atualizei o `wrangler.toml` com a configuração básica. Substitua o `database_id` pelo ID do seu banco.

### 3. Variáveis de Ambiente
No painel da Cloudflare Pages, adicione as seguintes variáveis:
- `JWT_SECRET`: Uma chave secreta para os tokens.
- `NODE_VERSION`: 18 ou superior.

## Como rodar localmente (Preview)
No Google AI Studio, o comando `npm run dev` inicia o `server.ts` usando Express e SQLite local. Isso deve funcionar normalmente para testes. Se o erro 405 persistir aqui, verifique se o servidor não travou (reiniciei ele agora).

## Próximos Passos
1. Migre as rotas de `server.ts` para `functions/api/[[path]].ts`.
2. Use `c.env.DB` para acessar o banco D1 dentro das Functions.
