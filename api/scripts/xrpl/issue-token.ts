import { Client } from 'xrpl';
import { config } from '../../src/config';
import { XrplService } from '../../src/xrpl/xrpl.service';

/**
 * Script to setup trustlines for vault and borrower
 * Run with: ts-node scripts/xrpl/issue-token.ts
 */
async function main() {
    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    const admin = xrplService.getAdminWallet();
    const vault = xrplService.getVaultWallet();
    const borrower = xrplService.getBorrowerWallet();

    console.log('Admin:', admin.address);
    console.log('Vault:', vault.address);
    console.log('Borrower:', borrower.address);

    // Setup trustlines
    console.log('Setting up trustlines...');
    const { vaultHash, borrowerHash } = await xrplService.setupTrustlines();

    console.log('Vault trustline hash:', vaultHash);
    console.log('Borrower trustline hash:', borrowerHash);
    console.log('Trust lines set.');

    await client.disconnect();
}

main().catch(console.error);

