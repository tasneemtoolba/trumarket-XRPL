import { Module } from '@nestjs/common';

import { BlockchainModule } from '@/blockchain/blockchain.module';
import { DatabaseModule } from '@/database/database.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { UsersModule } from '@/users/users.module';
import { XrplModule } from '@/xrpl/xrpl.module';

import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  controllers: [DealsController],
  providers: [DealsService],
  imports: [
    UsersModule,
    BlockchainModule,
    XrplModule,
    NotificationsModule,
    DatabaseModule,
  ],
  exports: [DealsService],
})
export class DealsModule { }
