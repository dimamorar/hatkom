# Hatkom

A Next.js application for calculating and analyzing PPSCC baselines and carbon emissions data.

## Live Demo

The application is deployed and available at: [hatkom.morar.dev](https://hatkom.morar.dev)

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Prisma](https://www.prisma.io) - Database ORM
- [Docker](https://www.docker.com) - Containerization
- [PostgreSQL](https://www.postgresql.org) - Database

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- npm, yarn, or pnpm

### Development Workflow

1. **Start the development stack:**

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

   This will start:

   - Next.js app in hot-reload mode
   - PostgreSQL database
   - Prisma Studio (port 5555)

2. **Stop the development stack:**

   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

3. **Database Management:**
   - Run migrations:
     ```bash
     docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev --name init
     ```
   - Seed the database:
     ```bash
     docker compose -f docker-compose.dev.yml exec app npm run prisma:seed
     ```

### Access Points

- Application: [http://localhost:3000](http://localhost:3000)
- Prisma Studio: [http://localhost:5555](http://localhost:5555)

### Development Features

- Hot reload enabled for immediate code changes
- Volume mounting for real-time code updates
- Prisma Studio for database management

## Production Deployment

1. **Build and start the production stack:**

   ```bash
   docker compose -f docker-compose.yml up --build -d
   ```

2. **Database Management in Production:**
   - Run migrations:
     ```bash
     docker compose -f docker-compose.yml exec app npx prisma migrate deploy
     ```
   - Seed the database (if needed):
     ```bash
     docker compose -f docker-compose.yml exec app npm run prisma:seed
     ```

## Data Processing Notes

The application handles several edge cases in data processing:

1. **Quarter-end Reports:**

   - When multiple reports exist at the end of a quarter (e.g., `TOUTC:"2024-06-30T00:42:00.000Z"` and `TOUTC:"2024-06-30T06:30:00.000Z"`), the system calculates the average of values.

2. **Zero Values:**

   - Records with `AERCO2eW2W` value of 0 are automatically skipped in calculations.

3. **PPSCC Baselines:**
   - The `calculatePPSCCBaselines` function has been modularized for better code organization and maintainability.
