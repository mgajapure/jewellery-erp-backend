import { defineConfig } from 'prisma/config';
import 'dotenv/config';
import * as path from 'path';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrate: {
    async adapter() {
      if (process.env.DATABASE_URL) {
        const { PrismaPg } = await import('@prisma/adapter-pg');
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        return new PrismaPg(pool);
      } else {
        const { PGlite } = await import('@electric-sql/pglite');
        const { PrismaPGlite } = await import('pglite-prisma-adapter');
        const dbPath = path.resolve(process.cwd(), '.pglite-dev-db');
        const client = new PGlite(dbPath);
        return new PrismaPGlite(client);
      }
    },
  },
});
