# Nutri

Aplicacao web para registro alimentar por conversa, com autenticacao Google, Supabase e estimativas nutricionais via Gemini.

## Stack

- `React 19`
- `TanStack Start`
- `Supabase` para autenticacao e persistencia
- `Google Gemini` para o chat de registro alimentar
- `Tailwind CSS 4`

## Requisitos

- `Node.js 22+`
- Projeto Supabase configurado
- Chave da API do Gemini (Google AI Studio)

## Variaveis de ambiente

### Cliente / Vite

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

### Servidor

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

### Opcional

```env
SUPABASE_SERVICE_ROLE_KEY=
```

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

## Banco de dados

O schema versionado fica em `supabase/migrations/20260703172100_initial_schema.sql`.

Ele documenta a estrutura atual esperada pelo app:

- `profiles`
- `meals`
- `chat_messages`
- `user_food_preferences`
- `weight_logs`

## Observacoes de produto

- O registro por foto ainda nao salva nem processa imagens: o chat responde que a funcionalidade esta em desenvolvimento.
- As refeicoes so sao persistidas apos confirmacao do usuario.
- A memoria contextual usa historico salvo e preferencias confirmadas por usuario.
