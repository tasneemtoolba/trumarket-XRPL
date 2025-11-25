import './instrument';

import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as schedule from 'node-schedule';
import * as webpush from 'web-push';

import { AppModule } from './app.module';
import { config } from './config';
import { ErrorsFilter } from './errors.filter';
import { syncDealsLogs } from './jobs/syncDealsLogs';
import { logger } from './logger';
import { XrplDepositDetectorService } from './xrpl/xrpl-deposit-detector.service';

// Only set VAPID details if keys are provided
if (config.vapidPublicKey && config.vapidPrivateKey && config.mailTo) {
  webpush.setVapidDetails(
    'mailto:' + config.mailTo,
    config.vapidPublicKey,
    config.vapidPrivateKey,
  );
} else {
  logger.warn('VAPID keys not configured - push notifications will not work');
}

async function bootstrap() {
  logger.info('Starting server...');
  const app = await NestFactory.create(AppModule);

  let docsPrefix = 'docs';

  if (process.env.NODE_ENV === 'production') {
    app.setGlobalPrefix('api/v2');
    docsPrefix = 'api/v2/docs';
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TruMarket Shipment API')
    .setVersion('1.1')
    .addTag('TruMarket')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(docsPrefix, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  if (process.env.E2E_TEST) {
    app.useLogger(false);
  } else {
    app.useLogger(app.get(Logger));
  }

  app.enableCors();

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ErrorsFilter(httpAdapter));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        exposeUnsetFields: false,
        excludeExtraneousValues: true,
      },
    }),
  );

  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: true,
    }),
  );

  schedule.scheduleJob('* * * * *', syncDealsLogs);

  // Schedule XRPL deposit detection (runs every minute)
  if (config.useXrpl) {
    const depositDetector = app.get(XrplDepositDetectorService);
    schedule.scheduleJob('* * * * *', async () => {
      await depositDetector.detectAndProcessDeposits();
    });
    logger.info('XRPL deposit detection job scheduled');
  }

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
