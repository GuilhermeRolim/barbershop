# Barbearia — Sistema de Agendamento

Sistema completo com 3 níveis de acesso (Dono, Barbeiro, Cliente), agendamento
com prevenção de conflito de horário, dashboard financeiro e lembretes por e-mail.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** + **Prisma ORM**
- **JWT** próprio (cookie httpOnly) para autenticação
- **Zod** para validação de entrada
- **Vitest** + **Testcontainers** para testes

## ⚠️ Sobre este pacote

Este código foi gerado e teve sua **sintaxe verificada automaticamente**
(0 erros em 25 arquivos `.ts`/`.tsx`, checagem via `ts.transpileModule`),
o schema Prisma teve sua estrutura validada manualmente (chaves balanceadas,
relations consistentes), e o JSON de configuração foi parseado com sucesso.

**O que NÃO foi possível testar** no ambiente onde este pacote foi gerado
(sandbox sem acesso à internet, logo sem `npm install`/`prisma generate`
reais): build do Next.js, geração do Prisma Client, execução da suíte de
testes contra um banco real, e o app rodando de fato no navegador.

**Por isso, siga os passos abaixo na sua máquina antes de considerar o
projeto validado.** Se algo falhar no seu ambiente, me mande o erro exato
que eu corrijo.

## Setup local

### 1. Pré-requisitos
- Node.js 20+
- Docker (para o Postgres local e para os testes de integração)

### 2. Instalar dependências
```bash
npm install
```

### 3. Subir o banco de dados
```bash
docker compose up -d
```

### 4. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Gere um JWT_SECRET forte, por exemplo:
openssl rand -base64 48
# Cole o valor gerado em JWT_SECRET no .env
```

### 5. Rodar as migrations e gerar o Prisma Client
```bash
npm run db:generate
npm run db:migrate
```

### 6. (Opcional) Popular com dados de teste
```bash
npm run db:seed
```
Isso cria:
- Dono: `dono@barbearia.com` / `senha123`
- Barbeiros: `joao@barbearia.com`, `pedro@barbearia.com` / `senha123`
- Cliente: `cliente@teste.com` / `senha123`

### 7. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000`.

### 8. Checar tipos e lint
```bash
npm run typecheck
npm run lint
```

### 9. Rodar os testes
```bash
# Testes unitários (mockados, rápidos)
npm run test -- appointment.service

# Teste de integração de concorrência (precisa de Docker rodando —
# sobe um Postgres efêmero automaticamente via Testcontainers)
npm run test -- appointment.concurrency
```

## Promovendo um usuário a Barbeiro ou Dono

O cadastro público (`/cadastro`) sempre cria `CLIENT`. Para promover alguém,
use o Prisma Studio (`npm run db:studio`) e altere o campo `role` diretamente,
ou crie um endpoint administrativo protegido (não incluso neste MVP —
ver seção 7 da explicação técnica original sobre próximos passos).

## Estrutura de pastas

```
src/
├── app/
│   ├── api/              # Route handlers (backend)
│   ├── (owner)/dashboard # Tela do dono
│   ├── (barber)/agenda   # Tela do barbeiro
│   ├── (client)/agendar  # Tela do cliente
│   ├── login/
│   └── cadastro/
├── lib/                  # auth, db, env, validações
├── services/              # regras de negócio (appointment.service.ts)
├── jobs/                 # cron de lembretes
└── middleware.ts         # RBAC por rota
tests/
├── appointment.service.test.ts              # unitário (mock)
└── appointment.concurrency.integration.test.ts  # integração (Testcontainers)
```

## Próximos passos sugeridos (fora do escopo deste MVP)

- Endpoint administrativo para o dono promover usuários a `BARBER`
- CRUD de serviços e disponibilidade pelo dono (hoje só via seed/Prisma Studio)
- Refresh token (sessão atual expira em 7 dias sem renovação automática)
- Rate limiting com Redis para produção multi-instância
- Campo `remindedAt` já existe no schema para idempotência do cron de lembrete
