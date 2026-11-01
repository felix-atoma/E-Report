# ADR 001 — NestJS rather than plain Express for the API

- **Status:** accepted (in place since the first commit, April 2026)
- **Recorded:** November 2026, reconstructed from the code — the original reasoning was not written down at the time.

## Context

The API serves six roles (super-admin, admin, teacher, bursar, parent, student) across many schools. Almost every route needs the same things: a valid login, a role check, a check that the data belongs to the caller's school, input validation, and consistent error messages. The product also needs background work: scheduled reminders, notification dispatch, PDF generation, and reactions to events (a sheet signed, a bulletin published).

Plain Express would have required building that structure by hand and keeping it consistent as the number of features grew (there are now 43 controllers and about 300 routes).

## Decision

Use **NestJS** (TypeScript) on top of Express, with:

- one module per feature (`backend/src/modules/<feature>/` — controller, service, DTOs);
- **global guards** registered once in `app.module.ts`: JWT authentication (opt out with `@Public()`), roles (`@Roles(...)`), rate limiting;
- **DTO classes with class-validator** for every request body;
- a global exception filter and response interceptor, so every answer has the same shape (`{ success, data | message, timestamp }`);
- `@nestjs/schedule` for cron jobs and `@nestjs/event-emitter` for events between modules;
- **Prisma** as the database layer, injected as a service.

## Consequences

**Good**

- A new route is secure by default: forgetting a decorator means "signed-in users only", never "public".
- Features stay separated; events (`fiche.signed`, `report.published`, `grades.corrected`) avoid modules calling each other directly.
- Swagger documentation is generated from the decorators (`/api/docs` outside production).
- TypeScript types are shared with Prisma's generated client, which catches schema mismatches at build time.

**Costs**

- More boilerplate than Express (module, controller, service, DTO for each feature) and a learning curve for contributors new to decorators and dependency injection.
- Cold start is slower than a minimal Express app (about 20 s on the free Render instance), which matters because the free plan sleeps — mitigated by the keep-awake ping (see [deployment.md](../architecture/deployment.md#staying-awake)).
- Cron jobs run inside the API process: they only run while the server is awake, and they would run twice if the API were scaled to two instances (not the case today).
