import { Client } from 'xrpl';
import { config } from '../../src/config';
import { XrplService } from '../../src/xrpl/xrpl.service';

/**
 * Script to check vault USD balance
 * Run with: ts-node scripts/xrpl/check-vault-balance.ts
 */
async function main() {
    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    const admin = xrplService.getAdminWallet();
    const vault = xrplService.getVaultWallet();

    console.log('Admin:', admin.address);
    console.log('Vault:', vault.address);

    const balance = await xrplService.getVaultUsdBalance();

    if (balance === 0) {
        console.log('No USD trust line / balance found yet.');
    } else {
        console.log('Vault USD balance:', balance);
    }

    await client.disconnect();
}

main().catch(console.error);

