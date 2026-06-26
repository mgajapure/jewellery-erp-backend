import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('database.url');

    let adapter: PrismaPg | PrismaPGlite;
    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      adapter = new PrismaPg(pool);
    } else {
      // No DATABASE_URL — use PGlite file-based DB for local development
      const dbPath = path.resolve(process.cwd(), '.pglite-dev-db');
      const client = new PGlite(dbPath);
      adapter = new PrismaPGlite(client);
      new Logger('PrismaService').log(`Using PGlite (file-based) at ${dbPath}`);
    }

    super({ adapter } as never);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
