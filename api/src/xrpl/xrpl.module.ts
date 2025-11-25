import { Module } from '@nestjs/common';
import { Client } from 'xrpl';

import { config } from '../config';
import { DatabaseModule } from '../database/database.module';
import { XrplService } from './xrpl.service';
import { XrplController } from './xrpl.controller';
import { XrplDepositService } from './xrpl-deposit.service';
import { XrplRedemptionService } from './xrpl-redemption.service';
import { XrplDepositDetectorService } from './xrpl-deposit-detector.service';

@Module({
    controllers: [XrplController],
    providers: [
        XrplService,
        XrplDepositService,
        XrplRedemptionService,
        XrplDepositDetectorService,
        {
            provide: 'XrplClient',
            useFactory: async (): Promise<Client> => {
                const client = new Client(config.xrplServerUrl);
                await client.connect();
                return client;
            },
        },
    ],
    imports: [DatabaseModule],
    exports: [
        XrplService,
        XrplDepositService,
        XrplRedemptionService,
        XrplDepositDetectorService,
    ],
})
export class XrplModule { }

