import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { DealsModule } from '@/deals/deals.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { UsersModule } from '@/users/users.module';
import { XrplModule } from '@/xrpl/xrpl.module';

import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersService],
  imports: [UsersModule, DealsModule, NotificationsModule, DatabaseModule, XrplModule],
})
export class AuthModule { }
