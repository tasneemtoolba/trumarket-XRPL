import * as fs from 'fs';
import * as path from 'path';
import { Inject, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SentryModule } from '@sentry/nestjs/setup';
import { Connection } from 'mongoose';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { providers } from './constants';
import { DatabaseModule } from './database/database.module';
import { DealsModule } from './deals/deals.module';
import { connectDB } from './infra/database/connectDB';
import { KYCModule } from './kyc/kyc.module';
import { loggerOptions } from './logger';
import { UsersModule } from './users/users.module';
import { XrplModule } from './xrpl/xrpl.module';

// Ensure log directory exists
if (config.logsDestination && config.logsDestination !== '1' && config.logsDestination !== '2') {
  const logDir = path.dirname(config.logsDestination);
  if (logDir && !fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      // If we can't create the directory, log to console instead
      console.warn(`Failed to create log directory ${logDir}:`, error);
    }
  }
}

const modules = [
  SentryModule.forRoot(),
  JwtModule.register({
    secret: config.jwtSecret,
    signOptions: { expiresIn: '1d' },
    global: true,
  }),
  DatabaseModule,
  AdminModule,
  AuthModule,
  UsersModule,
  DealsModule,
  KYCModule,
  XrplModule,
];

if (!process.env.E2E_TEST) {
  modules.unshift(
    LoggerModule.forRoot({
      pinoHttp:
        config.env === 'development' || config.prettyLogs
          ? {
            serializers: {
              req: ({ id, method, url, params, query }) => {
                return {
                  id,
                  method,
                  url,
                  params,
                  query,
                };
              },
              res: ({ statusCode }) => {
                return { statusCode };
              },
            },
            transport: { target: 'pino-pretty' },
            stream: pino.destination({
              dest: config.logsDestination,
              colorize: true,
              sync: false,
            }),
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              censor: '**REDACTED**',
            },
          }
          : loggerOptions,
      forRoutes: ['*'],
    }),
  );
}

@Module({
  imports: modules,
  controllers: [AppController],
  providers: [
    {
      provide: providers.DatabaseConnection,
      useFactory: async (): Promise<Connection> =>
        await connectDB(config.databaseUrl),
    },
  ],
})
export class AppModule {
  constructor(@Inject(providers.DatabaseConnection) private dbClient) { }

  async onModuleDestroy() {
    await this.dbClient.close();
  }
}
