# Setup and Run Guide

## Prerequisites

Before running the project locally, ensure the following are installed:

- Node.js 20 or later
- pnpm package manager
- Docker and Docker Compose
- Git

## Repository Setup

```bash
git clone <repository-url>
cd Life-Link
```

## Install Dependencies

```bash
corepack enable
pnpm install
```

## Environment Configuration

Create a local environment file from the project template if one is present, or set required variables for the API and web app before starting services.

Typical values include:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- backend provider settings for SMS, WhatsApp, and ABDM if enabled

## Start the Database

```bash
docker compose up -d
```

If the project uses Prisma, run:

```bash
pnpm db:push
pnpm db:seed
```

## Start the Application

From the project root:

```bash
pnpm dev
```

This launches the monorepo services for the app and API. In many setups, the frontend runs on port 3000 and the backend on port 4000.

## Useful Commands

```bash
# API only
pnpm dev:api

# Web app only
pnpm dev:web

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Default Demo Access

The project includes demo credentials for demonstration purposes. The exact credentials are documented in the main project README and demo data seed files.

Typical login flow:

- open the frontend URL in a browser,
- select a demo persona or login with a seeded facility account,
- navigate to the dashboard or request view,
- test emergency intake, matching, and logistics workflow.

## Verification

Once the app is running, validate:

- the login page loads,
- the dashboard renders seeded facility data,
- the API responds successfully,
- requests can be created and prioritized,
- logistics and donor views operate as expected.

## Troubleshooting

If startup fails, verify:

- Node.js version is compatible,
- dependencies are installed successfully,
- database services are running,
- environment variables are present and valid,
- Prisma schema has been pushed and the database has been seeded.
