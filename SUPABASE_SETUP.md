# Configuração do Supabase

O app exige um projeto Supabase. Não existe mais "modo local".

## 1. Banco

Num projeto **novo**, rode no SQL Editor, em ordem, todos os arquivos de
`supabase/migrations/` (`0000_baseline.sql`, `0001_…`, `0002_…`, …).

Em **produção**, `0000_baseline.sql` já está aplicado. Rode só as pendentes,
conforme a tabela de status em [`supabase/README.md`](supabase/README.md).

Nunca altere o banco direto pelo painel: crie um arquivo novo em
`supabase/migrations/`, teste com `npm run test:db` e só então rode.

## 2. Variáveis de ambiente

Crie `.env` na raiz (Settings → API no painel do Supabase):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Sem aspas. Reinicie o `npm run dev` depois de criar ou mudar o arquivo.
Sem essas variáveis, o app mostra uma tela avisando que falta configuração.

## 3. Autenticação

- **Desenvolvimento:** Authentication → Providers → Email → desligue
  "Confirm email" para criar contas sem confirmar o e-mail. Religue em produção.
- **Google (opcional):** Authentication → Providers → Google.

## Problemas comuns

- **429 Too Many Requests ao criar conta:** limite anti-spam do Supabase.
  Espere alguns minutos.
- **Variáveis não lidas:** `.env` precisa estar ao lado do `package.json`, e o
  servidor precisa ser reiniciado.
