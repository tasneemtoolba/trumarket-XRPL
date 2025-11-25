import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { XrplService } from './xrpl.service';
import { XrplDepositService } from './xrpl-deposit.service';
import { XrplRedemptionService } from './xrpl-redemption.service';
import { AuthGuard } from '@/guards/auth.guard';
import { User } from '@/users/users.entities';

@ApiTags('xrpl')
@Controller('xrpl')
@UseGuards(AuthGuard)
export class XrplController {
    constructor(
        private readonly xrplService: XrplService,
        private readonly depositService: XrplDepositService,
        private readonly redemptionService: XrplRedemptionService,
    ) { }

    @Post('investor/wallet')
    @ApiOperation({ summary: 'Create XRPL wallet for investor' })
    @ApiResponse({ status: 201, description: 'Wallet created successfully' })
    async createInvestorWallet() {
        const wallet = this.xrplService.generateInvestorWallet();
        return {
            address: wallet.address,
            seed: wallet.seed,
        };
    }

    @Post('deposit')
    @ApiOperation({ summary: 'Process deposit: USDC → USD.IOU → SHRx' })
    @ApiResponse({ status: 200, description: 'Deposit processed successfully' })
    async processDeposit(
        @Body() body: {
            usdcAmount: string;
            dealId: string;
            txHash: string;
        },
        @Request() req: { user: User },
    ) {
        const investorEVMAddress = req.user.walletAddress;
        return this.depositService.processDeposit(
            investorEVMAddress,
            body.usdcAmount,
            body.dealId,
            body.txHash,
        );
    }

    @Post('redeem')
    @ApiOperation({ summary: 'Process redemption: Burn SHRx → Return USD.IOU' })
    @ApiResponse({ status: 200, description: 'Redemption processed successfully' })
    async processRedemption(
        @Body() body: {
            sharesAmount: string;
            dealId: string;
        },
        @Request() req: { user: User },
    ) {
        const investorEVMAddress = req.user.walletAddress;
        return this.redemptionService.processRedemption(
            investorEVMAddress,
            body.sharesAmount,
            body.dealId,
        );
    }

    @Get('investor/shares')
    @ApiOperation({ summary: 'Get investor SHRx shares balance' })
    @ApiResponse({ status: 200, description: 'Shares balance retrieved' })
    async getInvestorShares(@Request() req: { user: User }) {
        if (!req.user.xrplWalletAddress) {
            return { balance: '0' };
        }
        const balance = await this.xrplService.getInvestorSharesBalance(
            req.user.xrplWalletAddress,
        );
        return { balance };
    }

    @Get('vault/balance')
    @ApiOperation({ summary: 'Get vault USD balance' })
    @ApiResponse({ status: 200, description: 'Vault balance retrieved' })
    async getVaultBalance() {
        const balance = await this.xrplService.getVaultUsdBalance();
        return { balance };
    }

    @Get('deal/:dealId/state')
    @ApiOperation({ summary: 'Get deal state (vault and borrower balances)' })
    @ApiResponse({ status: 200, description: 'Deal state retrieved' })
    async getDealState(@Param('dealId') dealId: string) {
        const state = await this.xrplService.showDealState();
        return state;
    }
}

