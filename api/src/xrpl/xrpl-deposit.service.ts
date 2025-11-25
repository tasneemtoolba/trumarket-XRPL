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
export class XrplDepositService {
    constructor(
        private readonly xrpl: XrplService,
        @Inject(providers.DealsRepository)
        private readonly dealsRepository: DealsRepository,
        @Inject(providers.UsersRepository)
        private readonly usersRepository: UsersRepository,
    ) { }

    /**
     * Process deposit: USDC on EVM → USD.IOU to vault → SHRx to investor
     * @param investorEVMAddress - Investor's EVM wallet address
     * @param usdcAmount - Amount of USDC deposited (in smallest unit, e.g., 1000000 for 1 USDC with 6 decimals)
     * @param dealId - Deal ID
     * @param txHash - EVM transaction hash of the deposit
     */
    async processDeposit(
        investorEVMAddress: string,
        usdcAmount: string,
        dealId: string,
        txHash: string,
    ): Promise<{
        usdIouHash: string;
        sharesHash: string;
    }> {
        if (!config.useXrpl) {
            throw new BadRequestError('XRPL mode not enabled');
        }

        logger.debug(
            `Processing XRPL deposit: investor=${investorEVMAddress}, amount=${usdcAmount}, deal=${dealId}`,
        );

        // 1. Get deal and verify it exists
        const deal = await this.dealsRepository.findById(dealId);
        if (!deal) {
            throw new BadRequestError(`Deal ${dealId} not found`);
        }

        if (!deal.xrplVaultAddress) {
            throw new BadRequestError(`Deal ${dealId} does not have XRPL vault`);
        }

        // 2. Get or create investor XRPL wallet
        const investor = await this.usersRepository.findByWalletAddress(
            investorEVMAddress,
        );
        if (!investor) {
            throw new BadRequestError(`Investor ${investorEVMAddress} not found`);
        }

        let investorXrplWallet: Wallet;
        let investorXrplAddress: string;

        if (investor.xrplWalletAddress && investor.xrplWalletSeed) {
            // Use existing wallet
            investorXrplWallet = Wallet.fromSeed(investor.xrplWalletSeed);
            investorXrplAddress = investor.xrplWalletAddress;
        } else {
            // Create new wallet and setup trustlines
            logger.debug(`Creating XRPL wallet for investor ${investorEVMAddress}`);
            investorXrplWallet = this.xrpl.generateInvestorWallet();
            investorXrplAddress = investorXrplWallet.address;

            // Setup trustlines
            await this.xrpl.setInvestorTrustlines(investorXrplWallet);

            // Store wallet in user
            await this.usersRepository.updateById(investor.id, {
                xrplWalletAddress: investorXrplAddress,
                xrplWalletSeed: investorXrplWallet.seed, // TODO: Encrypt this
            });
        }

        // 3. Convert USDC amount to USD.IOU amount (assuming 1:1, adjust decimals if needed)
        // USDC has 6 decimals, so we need to convert
        const usdcAmountNum = parseFloat(usdcAmount);
        const usdIouAmount = (usdcAmountNum / 1_000_000).toFixed(6); // Convert from 6 decimals

        // 4. Issue USD.IOU to vault
        logger.debug(
            `Issuing ${usdIouAmount} USD.IOU to vault ${deal.xrplVaultAddress}`,
        );
        const usdIouHash = await this.xrpl.issueUSDIOUToVault(
            deal.xrplVaultAddress,
            usdIouAmount,
        );

        // 5. Mint SHRx shares to investor (1:1 with USD.IOU for now, can adjust ratio)
        logger.debug(
            `Minting ${usdIouAmount} SHRx shares to investor ${investorXrplAddress}`,
        );
        const sharesHash = await this.xrpl.mintSharesToInvestor(
            investorXrplAddress,
            usdIouAmount,
        );

        logger.info(
            `Deposit processed: deal=${dealId}, investor=${investorEVMAddress}, usdIouHash=${usdIouHash}, sharesHash=${sharesHash}`,
        );

        return {
            usdIouHash,
            sharesHash,
        };
    }
}

