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

function saveDealState(state: DealState): void {
    fs.writeFileSync(DEAL_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Script to proceed with milestone payout
 * Run with: ts-node scripts/xrpl/proceed-milestone.ts
 */
async function main() {
    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    const state = loadDealState();
    const i = state.currentMilestoneIndex;
    const milestones = state.milestones;

    if (i >= milestones.length) {
        console.log('All milestones already completed.');
        await client.disconnect();
        return;
    }

    const pct = milestones[i];
    console.log(`Proceeding milestone index ${i} with pct = ${pct}%`);

    // Get vault balance
    const vaultBalance = await xrplService.getVaultUsdBalance();
    console.log('Current vault USD balance:', vaultBalance);

    if (vaultBalance <= 0) {
        console.log('Vault empty, nothing to pay.');
        await client.disconnect();
        return;
    }

    // Compute amount = vaultBalance * pct / 100
    const amount = (vaultBalance * pct) / 100;
    console.log(`Paying borrower ${amount.toFixed(6)} USD from vault via Payment.`);

    // Proceed milestone
    const hash = await xrplService.proceedMilestone(i, milestones);

    console.log('Payment transaction hash:', hash);

    // Increment milestone index & persist
    state.currentMilestoneIndex = i + 1;
    saveDealState(state);
    console.log('Updated dealState:', state);

    await client.disconnect();
}

main().catch(console.error);

