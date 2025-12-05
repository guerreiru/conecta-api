# Conecta API - Copilot Instructions

## Project Overview

TypeScript/Express REST API for a local services marketplace connecting clients with service providers. Built with TypeORM, PostgreSQL, and JWT authentication.

## Architecture Pattern

**3-Layer Architecture**: Routes → Controllers → Services → Database

- **Routes** (`src/routes/*.routes.ts`): Define endpoints, mount on central router in `src/routes/index.ts`
- **Controllers** (`src/controllers/*.controller.ts`): Static methods handling request/response, validation
- **Services** (`src/services/*.service.ts`): Business logic, TypeORM repository operations
- **Entities** (`src/entities/*.ts`): TypeORM decorators, relationships defined bidirectionally

**Example pattern** (see `service.routes.ts`, `service.controller.ts`, `service.service.ts`):

```typescript
// Route: serviceRoutes.get("/:id", ServiceController.getById);
// Controller: Static method with validation → call service
// Service: Repository operations, throw HttpError on failures
```

## Authentication & Authorization

**Dual-token JWT system** with httpOnly cookie storage:

- **Access tokens**: Short-lived (verify with `ACCESS_TOKEN_SECRET`), passed via `Authorization: Bearer` header or `accessToken` cookie
- **Refresh tokens**: 7-day expiry, hashed in database, stored in `refreshToken` httpOnly cookie
- **Middleware chain**: `authenticate` → `authorizeRoles("provider")` (see `src/routes/user.routes.ts`)

**Auth flow** (see `AuthService`):

1. Login: Generate both tokens, hash refresh token, store in `User.refreshToken`
2. Refresh: Verify refresh token, compare hash, issue new pair, rotate refresh token
3. Logout: Clear `refreshToken` field in database

**Custom types**: Extend Express Request with `req.user` via `src/express.d.ts` declaration file

## Database

**TypeORM with PostgreSQL** (`synchronize: true` in development):

- **No migrations in use**: Schema auto-synced from entities (see `src/database/index.ts`)
- **Entity relationships**:
  - `User` ↔ `Address` (OneToOne)
  - `User` → `Service[]` (OneToMany)
  - `Service` → `Category` (ManyToOne)
  - `City` → `State` (ManyToOne)

**Repository pattern**: Initialize in service constructors: `AppDataSource.getRepository(User)`

**Relations loading**: Use `relations` option explicitly (e.g., `{ relations: { address: true, services: { category: true } } }`)

## Error Handling

**Custom HttpError class** (`src/utils/httpError.ts`):

- Throw in services: `throw new HttpError("User not found", 404)`
- Caught by global `errorMiddleware` (registered last in `app.ts`)
- Controllers can also return direct responses for validation errors

## Key Conventions

**TypeScript**:

- CommonJS modules (`"module": "node16"`)
- Decorators enabled for TypeORM (`experimentalDecorators: true`)
- `"reflect-metadata"` imported in `server.ts` and `app.ts`

**Code organization**:

- Static controller methods (no instantiation needed)
- Service classes with repository as instance property
- Separation: Controllers validate primitives, services handle business rules

**Environment variables** (no `.env` file in repo):

- `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, `NODE_ENV`
- Loaded via `dotenv.config()` in `src/database/index.ts`

## Development Workflow

**Start dev server**: `pnpm dev` (uses `tsx watch`)
**Build**: `pnpm build` → outputs to `dist/`
**Production**: `pnpm start` (runs compiled `dist/server.js`)

**TypeORM commands** (currently unused):

- `pnpm migration:generate -- -d src/database/index.ts -n MigrationName`
- `pnpm migration:run`
- `pnpm schema:sync` / `pnpm schema:drop`

**Rate limiting**: 10 requests/second per IP (see `app.ts`)

**CORS**: Allowed origins hardcoded in `app.ts` (`https://conecta-theta-lime.vercel.app`, `http://localhost:3000`)

## Adding New Features

**New entity + CRUD**:

1. Create entity in `src/entities/` with TypeORM decorators
2. Add to `entities` array in `src/database/index.ts`
3. Create service with repository in `src/services/`
4. Create controller with static methods in `src/controllers/`
5. Create routes in `src/routes/`, mount in `src/routes/index.ts`

**Protected routes**: Apply `authenticate` middleware, optionally chain `authorizeRoles("provider")` for role-based access

**Password handling**: Always use `bcrypt` (see `AuthService.login`), select `password` explicitly via `select: ["password", ...]` (excluded by default)
