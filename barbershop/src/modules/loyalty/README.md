# modules/loyalty

Ainda não implementado — reservado para o programa de fidelidade
(pontos por corte, recompensas, níveis de cliente, etc.).

Quando for implementar, siga o mesmo padrão dos outros módulos:

```
modules/loyalty/
├── service.ts       # regra de negócio (ex: calculatePoints, redeemReward)
├── validation.ts     # schemas Zod de entrada
├── errors.ts          # erros de domínio (ex: InsufficientPointsError)
└── types.ts           # tipos compartilhados do domínio
```

Pontos de integração previstos com outros módulos (via tipos públicos,
nunca importando o `service.ts` interno de outro módulo diretamente):

- `modules/appointments` — ao concluir um agendamento (`status: COMPLETED`),
  este módulo precisaria ser notificado para creditar pontos. Sugestão:
  expor uma função `onAppointmentCompleted(appointmentId)` aqui, chamada
  pelo adaptador HTTP (`route.ts`) depois de `updateAppointmentStatus`
  retornar sucesso — não direto de dentro de `appointments/service.ts`,
  para não acoplar um módulo ao outro.
- `modules/users` — pontos acumulados por cliente provavelmente viram um
  novo campo ou tabela relacionada a `User`.
