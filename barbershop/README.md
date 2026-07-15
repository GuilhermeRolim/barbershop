# Barbearia — versão com novo frontend + correções aplicadas

Este pacote é o frontend novo (com componentes visuais, CSS modules,
AppShell, SiteHeader etc.) já com todas as correções de compatibilidade
com Next.js 15 e Vercel aplicadas:

## O que foi corrigido em relação ao pacote original enviado

1. **`src/lib/jwt.ts` (novo arquivo)** — usa a lib `jose` em vez de
   `jsonwebtoken`. Isso é obrigatório porque o `middleware.ts` roda no
   Edge Runtime da Vercel, que não suporta APIs Node.js puras. Sem essa
   troca, o login parece funcionar mas a sessão nunca é reconhecida nas
   páginas protegidas (loop de redirecionamento para /login).

2. **`src/lib/auth.ts`** — simplificado para cuidar só de hash de senha
   (bcrypt), delegando JWT para `jwt.ts`.

3. **`src/middleware.ts`** — importa de `@/lib/jwt`, função `verifyToken`
   agora é assíncrona.

4. **`src/lib/current-user.ts`** — `cookies()` do Next.js 15 é
   assíncrono; função `getCurrentUser` agora é `async`.

5. **`src/app/page.tsx`, `src/app/(barber)/layout.tsx`,
   `src/app/(client)/layout.tsx`, `src/app/(owner)/layout.tsx`** —
   todos tornados `async` para usar `await getCurrentUser()`.

6. **`src/app/api/appointments/[id]/route.ts`** — `params` agora é
   `Promise<{ id: string }>` (mudança do Next.js 15 para rotas dinâmicas).

7. **`src/app/login/page.tsx`** — conteúdo que usa `useSearchParams()`
   envolvido em `<Suspense>`, exigido pelo Next.js 15 para pré-renderização
   estática. Visual preservado (SiteHeader, Container, TextField, Button).

8. **`src/app/api/auth/login/route.ts` e `register/route.ts`** —
   `await signToken(...)` (a função virou assíncrona).

9. **`package.json`** — `jsonwebtoken` trocado por `jose`; `prisma` e
   `@prisma/client` fixados em `5.20.0` (sem `^`) tanto em `dependencies`
   quanto com `postinstall: prisma generate`, evitando que a Vercel baixe
   uma versão major nova incompatível durante o build.

## Deploy

Igual ao processo que você já vem fazendo: suba este conteúdo pro mesmo
repositório GitHub (substituindo os arquivos existentes), a Vercel vai
disparar o deploy automático. O banco de dados (Neon) não precisa de
nenhuma mudança — o schema é idêntico ao que já está em produção.

**Build Command na Vercel deve continuar:**
```
npx prisma generate && npx prisma db push && next build
```

**Framework Preset deve continuar:** Next.js
**Output Directory:** `.next` (sem override, ou com override apontando pra `.next`)
