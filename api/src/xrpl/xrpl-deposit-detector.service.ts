import { Inject, Injectable } from '@nestjs/common';
import {
    createPublicClient,
    formatUnits,
    http,
    parseAbi,
    PublicClient,
} from 'viem';

import { config } from '../config';
import { DealsRepository } from '../deals/deals.repository';
import { providers } from '../constants';
import { logger } from '../logger';
import { XrplDepositService } from './xrpl-deposit.service';

// Track processed deposits to avoid duplicates (in-memory cache)
// In production, use Redis or database for persistence
const processedDeposits = new Set<string>();

@Injectable()
export class XrplDepositDetectorService {
    private client: PublicClient;
    private lastProcessedBlock: number = 0;

    constructor(
        @Inject(providers.DealsRepository)
        private readonly dealsRepository: DealsRepository,
        private readonly depositService: XrplDepositService,
    ) {
        this.client = createPublicClient({
            transport: http(config.blockchainRpcUrl as string),
        }) as any;
    }

    /**
     * Detect USDC deposits for XRPL deals and automatically process them
     * This should be called periodically (e.g., every minute)
     */
    async detectAndProcessDeposits(): Promise<void> {
        if (!config.useXrpl) {
            return; // Skip if XRPL mode not enabled
        }

        logger.debug('Detecting XRPL deposits...');

        try {
            const toBlock = await this.client.getBlockNumber();
            const fromBlock = this.lastProcessedBlock
                ? BigInt(this.lastProcessedBlock + 1)
                : toBlock - BigInt(100); // Check last 100 blocks on first run

            if (fromBlock > toBlock) {
                return; // No new blocks
            }

            // Get all XRPL deals (deals with xrplVaultAddress)
            const allDeals = await this.dealsRepository.findAll();
            const xrplDeals =
                allDeals?.filter(
                    (deal) => deal.xrplVaultAddress && deal.vaultAddress,
                ) || [];

            if (xrplDeals.length === 0) {
                logger.debug('No XRPL deals found');
                this.lastProcessedBlock = Number(toBlock);
                return;
            }

            // Create a map of EVM vault addresses to deal info
            const vaultToDealMap = new Map<
                string,
                { dealId: string; xrplVaultAddress: string }
            >();
            xrplDeals.forEach((deal) => {
                if (deal.vaultAddress) {
                    vaultToDealMap.set(deal.vaultAddress.toLowerCase(), {
                        dealId: deal.id,
                        xrplVaultAddress: deal.xrplVaultAddress,
                    });
                }
            });

            // Monitor USDC transfers
            const logs = await this.client.getLogs({
                fromBlock,
                toBlock,
                address: config.investmentTokenContractAddress as `0x${string}`,
                events: parseAbi([
                    `event Transfer(address indexed from, address indexed to, uint256 value)`,
                ]),
            });

            logger.debug(
                `Found ${logs.length} USDC transfer events, checking for XRPL deposits...`,
            );

            // Process deposits
            for (const log of logs) {
                const depositKey = `${log.transactionHash}-${log.logIndex}`;

                // Skip if already processed
                if (processedDeposits.has(depositKey)) {
                    continue;
                }

                const toAddress = log.args.to?.toLowerCase();
                const fromAddress = log.args.from?.toLowerCase();
                const value = log.args.value;

                if (!toAddress || !fromAddress || !value) continue;

                // Check if this is a deposit to an XRPL deal vault
                const dealInfo = vaultToDealMap.get(toAddress);

                if (dealInfo) {
                    // This is a deposit to an XRPL deal vault!
                    // Note: fromAddress might be DealsManager if going through donateToDeal()
                    // We need to get the actual investor from the transaction
                    let investorAddress = fromAddress;

                    // If the transfer is from DealsManager, we need to trace back to find the investor
                    // For now, we'll try to get the transaction and find the original sender
                    try {
                        const tx = await this.client.getTransaction({
                            hash: log.transactionHash as `0x${string}`,
                        });
                        // The transaction's 'from' field is the actual investor
                        investorAddress = tx.from.toLowerCase();
                    } catch (err) {
                        logger.warn(
                            `Could not get transaction details for ${log.transactionHash}, using fromAddress: ${fromAddress}`,
                        );
                        // If we can't get the tx, skip this deposit (might be a redemption or other transfer)
                        // Only process if fromAddress is not DealsManager
                        if (
                            fromAddress.toLowerCase() ===
                            config.dealsManagerContractAddress?.toLowerCase()
                        ) {
                            logger.debug(
                                `Skipping transfer from DealsManager (could not trace investor): ${log.transactionHash}`,
                            );
                            continue;
                        }
                    }

                    const amount = value.toString();
                    const formattedAmount = formatUnits(
                        value,
                        config.investmentTokenDecimals
                            ? +config.investmentTokenDecimals
                            : 18,
                    );

                    logger.info(
                        `🚀 Detected USDC deposit to XRPL deal: deal=${dealInfo.dealId}, investor=${investorAddress}, amount=${formattedAmount}, tx=${log.transactionHash}`,
                    );

                    try {
                        // Automatically process the deposit
                        await this.depositService.processDeposit(
                            investorAddress,
                            amount,
                            dealInfo.dealId,
                            log.transactionHash,
                        );

                        // Mark as processed
                        processedDeposits.add(depositKey);

                        logger.info(
                            `✅ Successfully processed XRPL deposit: deal=${dealInfo.dealId}, tx=${log.transactionHash}`,
                        );
                    } catch (error) {
                        logger.error(
                            error,
                            `❌ Failed to process XRPL deposit: deal=${dealInfo.dealId}, tx=${log.transactionHash}`,
                        );
                        // Don't mark as processed if it failed - will retry on next run
                    }
                }
            }

            // Update last processed block
            this.lastProcessedBlock = Number(toBlock);

            // Clean up old processed deposits (keep last 1000)
            if (processedDeposits.size > 1000) {
                const entries = Array.from(processedDeposits);
                processedDeposits.clear();
                entries.slice(-1000).forEach((entry) => processedDeposits.add(entry));
            }

            logger.debug(
                `XRPL deposit detection complete. Processed block ${toBlock}`,
            );
        } catch (err) {
            logger.error(err, 'Error detecting XRPL deposits');
        }
    }
}

