# XRPL Environment Variables Setup

## Required Environment Variables

Add these to your `.env` file to enable XRPL functionality:

```bash
# XRPL Configuration
USE_XRPL=true  # Set to 'true' to enable XRPL mode, 'false' or omit for EVM mode
XRPL_SERVER_URL=wss://s.altnet.rippletest.net:51233  # Testnet by default
XRPL_ADMIN_SEED=your_admin_wallet_seed_here  # Only admin seed needed
```

**Note**: Vault and borrower wallets are created **automatically per deal** (just like DealVault contracts in EVM). You only need the admin seed for issuing USD IOU.

## Getting Started

### 1. Generate Admin Wallet

Run the setup script to generate an admin wallet:

```bash
ts-node api/scripts/xrpl/setup-wallets.ts
```

This will output admin, vault, and borrower wallets. **Only use the admin wallet seed** - vault and borrower are for reference/testing only.

### 2. Fund Admin Wallet

Go to https://testnet.xrpl.org/faucet and fund the admin address with test XRP (minimum 10 XRP for account activation).

### 3. Set Environment Variables

Copy the admin seed from step 1 into your `.env` file:

```bash
XRPL_ADMIN_SEED=your_admin_seed_here
```

### 4. Create a Deal

When you create a deal through the API:
- ✅ A new vault wallet is **automatically created** for that deal
- ✅ A new borrower wallet is **automatically created** for that deal  
- ✅ Trustlines are **automatically set up** for both vault and borrower
- ✅ The deal NFT is **automatically minted** on XRPL

**No manual setup required!** This matches the EVM behavior where `DealVault` contracts are created automatically.

### 5. Fund Vault (When Investors Deposit)

Vaults are funded **automatically when investors deposit**:
- Investor deposits USDC on EVM
- Backend issues USD.IOU to the deal's XRPL vault
- Backend mints SHRx shares to investor's XRPL wallet

**Note**: The `fund-vault.ts` script is for testing only. In production, vaults are funded through the deposit flow.

## Production Setup

For production, use mainnet:

```bash
USE_XRPL=true
XRPL_SERVER_URL=wss://xrplcluster.com  # Mainnet
XRPL_ADMIN_SEED=your_production_admin_seed
```

**⚠️ Security Notes**: 
- Never commit seeds to version control
- Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Encrypt vault and borrower seeds at rest (stored in Deal entity)
- Use different admin wallet for testnet and mainnet
- Vault and borrower seeds are stored per-deal and should be encrypted in the database

## Validation

The API will validate that XRPL seeds are provided when `USE_XRPL=true`. If seeds are missing, operations will fail with clear error messages.

