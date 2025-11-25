import { Client } from 'xrpl';
import { config } from '../../src/config';
import { XrplService, DealMetadata } from '../../src/xrpl/xrpl.service';

/**
 * Script to mint deal NFT
 * Usage: ts-node scripts/xrpl/mint-deal-nft.ts [dealId] [borrowerAddress] [maxDeposit]
 * Example: ts-node scripts/xrpl/mint-deal-nft.ts 1 rBorrower123 1000
 */
async function main() {
    const dealId = parseInt(process.argv[2] || '1');
    const borrowerAddressArg = process.argv[3];
    const maxDeposit = process.argv[4] || '1000';

    const client = new Client(config.xrplServerUrl);
    await client.connect();

    const xrplService = new XrplService(client);

    // Get borrower address from arg or from config
    let borrowerAddress = borrowerAddressArg;
    if (!borrowerAddress && config.xrplBorrowerSeed) {
        borrowerAddress = xrplService.getBorrowerWallet().address;
    }

    if (!borrowerAddress) {
        console.error('Borrower address required. Provide as argument or set XRPL_BORROWER_SEED in env.');
        await client.disconnect();
        process.exit(1);
    }

    const metadata: DealMetadata = {
        dealId,
        borrower: borrowerAddress,
        milestones: [20, 30, 50],
        maxDeposit: `${maxDeposit} USD`,
    };

    console.log('Minting NFT with metadata:', metadata);

    const hash = await xrplService.mintDealNft(metadata);

    console.log('Transaction hash:', hash);
    console.log('NFT minted successfully.');

    await client.disconnect();
}

main().catch(console.error);

