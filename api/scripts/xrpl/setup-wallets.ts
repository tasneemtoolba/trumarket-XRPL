import { Wallet } from 'xrpl';

/**
 * Script to generate XRPL wallets for admin, vault, and borrower
 * Run with: ts-node scripts/xrpl/setup-wallets.ts
 */
async function main() {
    const admin = Wallet.generate();
    const vault = Wallet.generate();
    const borrower = Wallet.generate();

    console.log('==== GENERATED WALLETS ====');
    console.log('ADMIN ADDRESS:', admin.address);
    console.log('ADMIN SEED:', admin.seed);
    console.log('VAULT ADDRESS:', vault.address);
    console.log('VAULT SEED:', vault.seed);
    console.log('BORROWER ADDRESS:', borrower.address);
    console.log('BORROWER SEED:', borrower.seed);

    console.log(
        '\nGo to https://testnet.xrpl.org/faucet to fund these addresses with test XRP.',
    );
}

main().catch(console.error);

