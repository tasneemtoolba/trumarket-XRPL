import { Client } from 'xrpl';
import { config } from '../../src/config';
import { XrplService } from '../../src/xrpl/xrpl.service';

/**
 * Script to fund vault with USD IOU
 * Usage: ts-node scripts/xrpl/fund-vault.ts [amount]
 * Default: 1000
 */
async function main() {
    const amount = process.argv[2] || '1000';

    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    const admin = xrplService.getAdminWallet();
    const vault = xrplService.getVaultWallet();

    console.log('Admin:', admin.address);
    console.log('Vault:', vault.address);
    console.log(`Funding vault with ${amount} USD...`);

    const hash = await xrplService.fundVault(amount);

    console.log('Transaction hash:', hash);
    console.log('Vault funded successfully.');

    await client.disconnect();
}

main().catch(console.error);

