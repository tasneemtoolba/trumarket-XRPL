import { Inject, Injectable } from '@nestjs/common';
import { Wallet } from 'xrpl';

import { config } from '../config';
import { BadRequestError, InternalServerError } from '../errors';
import { logger } from '../logger';
import { DealsRepository } from '../deals/deals.repository';
import { providers } from '../constants';
import { UsersRepository } from '../users/users.repository';
import { XrplService } from './xrpl.service';

@Injectable()
export class XrplRedemptionService {
    constructor(
        private readonly xrpl: XrplService,
        @Inject(providers.DealsRepository)
        private readonly dealsRepository: DealsRepository,
        @Inject(providers.UsersRepository)
        private readonly usersRepository: UsersRepository,
    ) { }

    /**
     * Process redemption: Burn SHRx → Return USD.IOU → Return USDC
     * @param investorEVMAddress - Investor's EVM wallet address
     * @param sharesAmount - Amount of SHRx shares to redeem
     * @param dealId - Deal ID
     */
    async processRedemption(
        investorEVMAddress: string,
        sharesAmount: string,
        dealId: string,
    ): Promise<{
        burnHash: string;
        usdIouReturnHash: string;
        // Note: USDC return would be handled separately via EVM transfer
        // This service only handles XRPL operations
    }> {
        if (!config.useXrpl) {
            throw new BadRequestError('XRPL mode not enabled');
        }

        logger.debug(
            `Processing XRPL redemption: investor=${investorEVMAddress}, shares=${sharesAmount}, deal=${dealId}`,
        );

        // 1. Get deal and verify it exists
        const deal = await this.dealsRepository.findById(dealId);
        if (!deal) {
            throw new BadRequestError(`Deal ${dealId} not found`);
        }

        if (!deal.xrplVaultAddress || !deal.xrplVaultSeed) {
            throw new BadRequestError(`Deal ${dealId} does not have XRPL vault`);
        }

        // 2. Get investor XRPL wallet
        const investor = await this.usersRepository.findByWalletAddress(
            investorEVMAddress,
        );
        if (!investor) {
            throw new BadRequestError(`Investor ${investorEVMAddress} not found`);
        }

        if (!investor.xrplWalletAddress || !investor.xrplWalletSeed) {
            throw new BadRequestError(
                `Investor ${investorEVMAddress} does not have XRPL wallet`,
            );
        }

        const investorXrplWallet = Wallet.fromSeed(investor.xrplWalletSeed);

        // 3. Verify investor has enough shares
        const currentShares = await this.xrpl.getInvestorSharesBalance(
            investor.xrplWalletAddress,
        );
        if (parseFloat(currentShares) < parseFloat(sharesAmount)) {
            throw new BadRequestError(
                `Insufficient shares. Current: ${currentShares}, Requested: ${sharesAmount}`,
            );
        }

        // 4. Burn SHRx shares
        logger.debug(`Burning ${sharesAmount} SHRx shares from investor`);
        const burnHash = await this.xrpl.burnSharesFromInvestor(
            investorXrplWallet,
            sharesAmount,
        );

        // 5. Return USD.IOU from vault to investor
        const vaultWallet = Wallet.fromSeed(deal.xrplVaultSeed);
        logger.debug(
            `Returning ${sharesAmount} USD.IOU from vault to investor`,
        );
        const usdIouReturnHash = await this.xrpl.returnUSDIOUFromVault(
            vaultWallet,
            investor.xrplWalletAddress,
            sharesAmount,
        );

        // 6. Note: USDC return to EVM wallet would be handled separately
        // This would require:
        // - Tracking USD.IOU balance
        // - Transferring USDC from treasury to investor EVM wallet
        // - This is a separate service/endpoint

        logger.info(
            `Redemption processed: deal=${dealId}, investor=${investorEVMAddress}, burnHash=${burnHash}, usdIouReturnHash=${usdIouReturnHash}`,
        );

        return {
            burnHash,
            usdIouReturnHash,
        };
    }
}

