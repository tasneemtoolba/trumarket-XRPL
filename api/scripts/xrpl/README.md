# XRPL Scripts

This directory contains utility scripts for interacting with the XRPL testnet/mainnet.

## Prerequisites

1. Set up environment variables in your `.env` file:
   ```bash
   XRPL_SERVER_URL=wss://s.altnet.rippletest.net:51233
   XRPL_ADMIN_SEED=your_admin_seed_here
   XRPL_VAULT_SEED=your_vault_seed_here
   XRPL_BORROWER_SEED=your_borrower_seed_here
   ```

2. Fund your wallets with test XRP from https://testnet.xrpl.org/faucet

## Scripts

### 1. Setup Wallets
Generate new wallets for admin, vault, and borrower:
```bash
ts-node scripts/xrpl/setup-wallets.ts
```

### 2. Issue Token (Setup Trustlines)
Setup trustlines for vault and borrower to accept USD IOU:
```bash
ts-node scripts/xrpl/issue-token.ts
```

### 3. Fund Vault
Fund the vault with USD IOU:
```bash
ts-node scripts/xrpl/fund-vault.ts [amount]
# Example: ts-node scripts/xrpl/fund-vault.ts 1000
```

### 4. Mint Deal NFT
Mint a deal NFT with metadata:
```bash
ts-node scripts/xrpl/mint-deal-nft.ts [dealId] [borrowerAddress] [maxDeposit]
# Example: ts-node scripts/xrpl/mint-deal-nft.ts 1 rBorrower123 1000
```

### 5. Check Vault Balance
Check the current USD balance in the vault:
```bash
ts-node scripts/xrpl/check-vault-balance.ts
```

### 6. Show Deal State
Display the current deal state including vault and borrower balances:
```bash
ts-node scripts/xrpl/show-deal.ts
```

### 7. Proceed Milestone
Proceed with the next milestone payout:
```bash
ts-node scripts/xrpl/proceed-milestone.ts
```

## Workflow Example

1. Generate wallets: `setup-wallets.ts`
2. Fund wallets with test XRP from faucet
3. Setup trustlines: `issue-token.ts`
4. Fund vault: `fund-vault.ts 1000`
5. Mint deal NFT: `mint-deal-nft.ts 1 <borrower_address> 1000`
6. Check state: `show-deal.ts`
7. Proceed milestones: `proceed-milestone.ts` (run multiple times)

## Integration with API

The XRPL service is available as a NestJS module. Import `XrplModule` in your modules to use `XrplService`:

```typescript
import { XrplModule } from '@/xrpl/xrpl.module';

@Module({
  imports: [XrplModule],
  // ...
})
export class YourModule {}
```

Then inject `XrplService` in your services:

```typescript
constructor(private readonly xrplService: XrplService) {}
```

