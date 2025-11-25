import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'xrpl';
import { config } from '../../src/config';
import { XrplService, DealState } from '../../src/xrpl/xrpl.service';

const DEAL_STATE_FILE = path.join(__dirname, '../../dealState.json');

function loadDealState(): DealState {
    try {
        const raw = fs.readFileSync(DEAL_STATE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        // Return default state if file doesn't exist
        return {
            milestones: [20, 30, 50],
            currentMilestoneIndex: 0,
        };
    }
}

/**
 * Script to show deal state (vault and borrower balances)
 * Run with: ts-node scripts/xrpl/show-deal.ts
 */
async function main() {
    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    const state = loadDealState();
    const { vaultBalance, borrowerBalance } = await xrplService.showDealState();

    const vault = xrplService.getVaultWallet();
    const borrower = xrplService.getBorrowerWallet();

    console.log('========= DEAL STATE =========');
    console.log('Current milestone index:', state.currentMilestoneIndex);
    console.log('Milestone percentages:', state.milestones);
    console.log('------------------------------');
    console.log('Vault:', vault.address);
    console.log('Vault USD balance:', vaultBalance);
    console.log('------------------------------');
    console.log('Borrower:', borrower.address);
    console.log('Borrower USD balance:', borrowerBalance);

    await client.disconnect();
}

main().catch(console.error);

