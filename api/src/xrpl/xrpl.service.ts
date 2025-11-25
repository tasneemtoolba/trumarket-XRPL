import { Inject, Injectable } from '@nestjs/common';
import { Client, Wallet } from 'xrpl';
import xrpl from 'xrpl';
import { config } from '../config';
import { InternalServerError } from '../errors';

export interface DealMetadata {
    dealId: number;
    borrower: string;
    milestones: number[];
    maxDeposit: string;
}

export interface DealState {
    milestones: number[];
    currentMilestoneIndex: number;
}

@Injectable()
export class XrplService {
    constructor(@Inject('XrplClient') private readonly client: Client) { }

    /**
     * Get XRPL client instance
     */
    getClient(): Client {
        return this.client;
    }

    /**
     * Get admin wallet from seed
     */
    getAdminWallet(): Wallet {
        if (!config.xrplAdminSeed) {
            throw new InternalServerError('XRPL_ADMIN_SEED missing in config');
        }
        return Wallet.fromSeed(config.xrplAdminSeed);
    }

    /**
     * Get vault wallet - DEPRECATED: Use deal-specific vault addresses instead
     * @deprecated This method assumes a single global vault. Use deal-specific vault addresses.
     */
    getVaultWallet(): Wallet {
        throw new InternalServerError(
            'getVaultWallet() is deprecated. Each deal has its own vault. Use the vault address from the deal instead.',
        );
    }

    /**
     * Get borrower wallet - DEPRECATED: Use deal-specific borrower addresses instead
     * @deprecated This method assumes a single global borrower. Use deal-specific borrower addresses.
     */
    getBorrowerWallet(): Wallet {
        throw new InternalServerError(
            'getBorrowerWallet() is deprecated. Each deal has its own borrower. Use the borrower address from the deal instead.',
        );
    }

    /**
     * Create a new vault wallet for a deal
     * Each deal gets its own vault account (like DealVault contract)
     */
    createDealVault(): Wallet {
        return Wallet.generate();
    }

    /**
     * Create a new borrower wallet for a deal
     * Or use existing borrower address if provided
     */
    createDealBorrower(borrowerAddress?: string): Wallet {
        if (borrowerAddress) {
            // If borrower address provided, we need to derive wallet from it
            // For now, generate new one - in production you'd store the wallet
            return Wallet.generate();
        }
        return Wallet.generate();
    }

    /**
     * Setup trustlines for a deal vault and borrower
     * This is called automatically when a deal is created
     */
    async setupDealTrustlines(
        vaultWallet: Wallet,
        borrowerWallet: Wallet,
    ): Promise<{ vaultHash: string; borrowerHash: string }> {
        const admin = this.getAdminWallet();

        // Set trustline: VAULT trusts ADMIN's USD
        const vaultRes = await this.client.submitAndWait(
            {
                TransactionType: 'TrustSet',
                Account: vaultWallet.address,
                LimitAmount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: '1000000', // max vault can hold
                },
            },
            { wallet: vaultWallet },
        );

        // Set trustline: BORROWER trusts ADMIN's USD
        const borrowerRes = await this.client.submitAndWait(
            {
                TransactionType: 'TrustSet',
                Account: borrowerWallet.address,
                LimitAmount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: '1000000',
                },
            },
            { wallet: borrowerWallet },
        );

        const vaultResult = (vaultRes.result ?? vaultRes) as any;
        const borrowerResult = (borrowerRes.result ?? borrowerRes) as any;

        const vaultHash = vaultResult.hash || vaultResult.tx_json?.hash || vaultResult.transaction?.hash;
        const borrowerHash = borrowerResult.hash || borrowerResult.tx_json?.hash || borrowerResult.transaction?.hash;

        if (!vaultHash || !borrowerHash) {
            throw new InternalServerError('Failed to extract transaction hash from trustline setup');
        }

        return {
            vaultHash,
            borrowerHash,
        };
    }

    /**
     * Generate new wallets for admin, vault, and borrower
     */
    generateWallets(): {
        admin: Wallet;
        vault: Wallet;
        borrower: Wallet;
    } {
        return {
            admin: Wallet.generate(),
            vault: Wallet.generate(),
            borrower: Wallet.generate(),
        };
    }

    /**
     * Generate a new XRPL wallet for an investor
     */
    generateInvestorWallet(): Wallet {
        return Wallet.generate();
    }

    /**
     * Set trustline for investor to accept USD IOU and SHRx shares
     */
    async setInvestorTrustlines(
        investorWallet: Wallet,
        usdLimit: string = '1000000',
        sharesLimit: string = '1000000',
    ): Promise<{ usdHash: string; sharesHash: string }> {
        const admin = this.getAdminWallet();

        // Set USD trustline
        const usdRes = await this.client.submitAndWait(
            {
                TransactionType: 'TrustSet',
                Account: investorWallet.address,
                LimitAmount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: usdLimit,
                },
            },
            { wallet: investorWallet },
        );

        // Set SHRx (shares) trustline
        const sharesRes = await this.client.submitAndWait(
            {
                TransactionType: 'TrustSet',
                Account: investorWallet.address,
                LimitAmount: {
                    currency: 'SHRx',
                    issuer: admin.address,
                    value: sharesLimit,
                },
            },
            { wallet: investorWallet },
        );

        const usdResult = (usdRes.result ?? usdRes) as any;
        const sharesResult = (sharesRes.result ?? sharesRes) as any;

        const usdHash = usdResult.hash || usdResult.tx_json?.hash || usdResult.transaction?.hash;
        const sharesHash = sharesResult.hash || sharesResult.tx_json?.hash || sharesResult.transaction?.hash;

        if (!usdHash || !sharesHash) {
            throw new InternalServerError('Failed to extract transaction hash from trustline setup');
        }

        return {
            usdHash,
            sharesHash,
        };
    }

    /**
     * Fund vault with USD IOU
     */
    async fundVault(amount: string): Promise<string> {
        const admin = this.getAdminWallet();
        const vault = this.createDealVault();

        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: admin.address,
                Destination: vault.address,
                Amount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: amount,
                },
            },
            { wallet: admin },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to fund vault - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Mint deal NFT with metadata
     */
    async mintDealNft(metadata: DealMetadata): Promise<string> {
        const admin = this.getAdminWallet();

        const uri = xrpl.convertStringToHex(
            'data:application/json,' + JSON.stringify(metadata),
        );

        const res = await this.client.submitAndWait(
            {
                TransactionType: 'NFTokenMint',
                Account: admin.address,
                URI: uri,
                NFTokenTaxon: 0,
                Flags: 1,
            },
            { wallet: admin },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to mint deal NFT - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Set trustline for an account to accept USD IOU
     */
    async setTrustline(
        account: Wallet,
        issuer: string,
        limit: string = '1000000',
    ): Promise<string> {
        const res = await this.client.submitAndWait(
            {
                TransactionType: 'TrustSet',
                Account: account.address,
                LimitAmount: {
                    currency: 'USD',
                    issuer: issuer,
                    value: limit,
                },
            },
            { wallet: account },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to set trustline - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Setup trustlines for vault and borrower
     */
    async setupTrustlines(): Promise<{ vaultHash: string; borrowerHash: string }> {
        const admin = this.getAdminWallet();
        const vault = this.getVaultWallet();
        const borrower = this.getBorrowerWallet();

        const vaultHash = await this.setTrustline(vault, admin.address);
        const borrowerHash = await this.setTrustline(borrower, admin.address);

        return { vaultHash, borrowerHash };
    }

    /**
     * Get IOU balance for an account
     */
    async getIOUBalance(
        issuer: string,
        account: string,
        currency: string = 'USD',
    ): Promise<string> {
        const lines = await this.client.request({
            command: 'account_lines',
            account,
            ledger_index: 'validated',
        });

        const line = lines.result.lines.find(
            (l) => l.currency === currency && l.account === issuer,
        );

        return line ? line.balance : '0';
    }

    /**
     * Get vault USD balance
     */
    async getVaultUsdBalance(): Promise<number> {
        const admin = this.getAdminWallet();
        const vault = this.getVaultWallet();

        const balance = await this.getIOUBalance(admin.address, vault.address, 'USD');
        return parseFloat(balance);
    }

    /**
     * Proceed with milestone payout
     * @param vaultAddress - The vault address for this specific deal
     * @param borrowerAddress - The borrower address for this specific deal
     * @param milestoneIndex - Current milestone index
     * @param milestones - Array of milestone percentages
     */
    async proceedMilestone(
        vaultAddress: string,
        borrowerAddress: string,
        milestoneIndex: number,
        milestones: number[],
    ): Promise<string> {
        if (milestoneIndex >= milestones.length) {
            throw new InternalServerError('All milestones already completed');
        }

        const admin = this.getAdminWallet();

        // Get vault balance for this specific deal vault
        const vaultBalanceStr = await this.getIOUBalance(
            admin.address,
            vaultAddress,
            'USD',
        );
        const balance = parseFloat(vaultBalanceStr);

        if (balance <= 0) {
            throw new InternalServerError('Vault empty, nothing to pay');
        }

        // Compute amount = vaultBalance * pct / 100
        const pct = milestones[milestoneIndex];
        const amount = (balance * pct) / 100;
        const amountStr = amount.toFixed(6);

        // Note: In XRPL, we need the vault wallet to sign the payment
        // In production, you'd retrieve the vault wallet from secure storage
        // For now, we'll need to store vault wallets when creating deals
        // This is a limitation - we need vault wallet to sign, not just address

        // Get vault wallet from stored seed (encrypted in production)
        // For now, we'll need to pass it or retrieve from secure storage
        // This should be stored when the deal is created
        throw new InternalServerError(
            'Vault wallet needed for payment. Implement vault wallet storage when creating deal.',
        );
    }

    /**
     * Proceed with milestone payout (with vault wallet)
     * Internal method that requires the vault wallet
     */
    async proceedMilestoneWithWallet(
        vaultWallet: Wallet,
        borrowerAddress: string,
        milestoneIndex: number,
        milestones: number[],
    ): Promise<string> {
        if (milestoneIndex >= milestones.length) {
            throw new InternalServerError('All milestones already completed');
        }

        const admin = this.getAdminWallet();

        // Get vault balance
        const vaultBalanceStr = await this.getIOUBalance(
            admin.address,
            vaultWallet.address,
            'USD',
        );
        const balance = parseFloat(vaultBalanceStr);

        if (balance <= 0) {
            throw new InternalServerError('Vault empty, nothing to pay');
        }

        // Compute amount = vaultBalance * pct / 100
        const pct = milestones[milestoneIndex];
        const amount = (balance * pct) / 100;
        const amountStr = amount.toFixed(6);

        // Direct Payment from VAULT -> BORROWER (IOU)
        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: vaultWallet.address,
                Destination: borrowerAddress,
                Amount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: amountStr,
                },
            },
            { wallet: vaultWallet },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to proceed milestone - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Show deal state (vault and borrower balances)
     */
    async showDealState(): Promise<{
        vaultBalance: string;
        borrowerBalance: string;
    }> {
        const admin = this.getAdminWallet();
        const vault = this.getVaultWallet();
        const borrower = this.getBorrowerWallet();

        const vaultBalance = await this.getIOUBalance(
            admin.address,
            vault.address,
            'USD',
        );
        const borrowerBalance = await this.getIOUBalance(
            admin.address,
            borrower.address,
            'USD',
        );

        return { vaultBalance, borrowerBalance };
    }

    /**
     * Issue USD.IOU to vault (when investor deposits USDC)
     * @param vaultAddress - The vault address for the deal
     * @param amount - Amount of USD.IOU to issue
     */
    async issueUSDIOUToVault(
        vaultAddress: string,
        amount: string,
    ): Promise<string> {
        const admin = this.getAdminWallet();

        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: admin.address,
                Destination: vaultAddress,
                Amount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: amount,
                },
            },
            { wallet: admin },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to issue USD.IOU to vault - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Mint SHRx shares to investor wallet
     * @param investorAddress - Investor's XRPL wallet address
     * @param amount - Amount of SHRx shares to mint
     */
    async mintSharesToInvestor(
        investorAddress: string,
        amount: string,
    ): Promise<string> {
        const admin = this.getAdminWallet();

        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: admin.address,
                Destination: investorAddress,
                Amount: {
                    currency: 'SHRx',
                    issuer: admin.address,
                    value: amount,
                },
            },
            { wallet: admin },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to mint SHRx shares - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Burn SHRx shares from investor wallet (for redemption)
     * @param investorWallet - Investor's XRPL wallet
     * @param amount - Amount of SHRx to burn
     */
    async burnSharesFromInvestor(
        investorWallet: Wallet,
        amount: string,
    ): Promise<string> {
        const admin = this.getAdminWallet();

        // To "burn" shares, we send them back to the issuer (admin)
        // The issuer can then reduce the total supply
        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: investorWallet.address,
                Destination: admin.address,
                Amount: {
                    currency: 'SHRx',
                    issuer: admin.address,
                    value: amount,
                },
            },
            { wallet: investorWallet },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to burn SHRx shares - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Return USD.IOU from vault to investor (for redemption)
     * @param vaultWallet - Vault wallet for the deal
     * @param investorAddress - Investor's XRPL wallet address
     * @param amount - Amount of USD.IOU to return
     */
    async returnUSDIOUFromVault(
        vaultWallet: Wallet,
        investorAddress: string,
        amount: string,
    ): Promise<string> {
        const admin = this.getAdminWallet();

        const res = await this.client.submitAndWait(
            {
                TransactionType: 'Payment',
                Account: vaultWallet.address,
                Destination: investorAddress,
                Amount: {
                    currency: 'USD',
                    issuer: admin.address,
                    value: amount,
                },
            },
            { wallet: vaultWallet },
        );

        const result = (res.result ?? res) as any;
        const hash = result.hash || result.tx_json?.hash || result.transaction?.hash;

        if (!hash) {
            throw new InternalServerError('Failed to return USD.IOU from vault - transaction hash not found in response');
        }

        return hash;
    }

    /**
     * Get SHRx balance for an investor
     */
    async getInvestorSharesBalance(
        investorAddress: string,
    ): Promise<string> {
        const admin = this.getAdminWallet();
        return this.getIOUBalance(admin.address, investorAddress, 'SHRx');
    }

    /**
     * Helper: sleep
     */
    sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

