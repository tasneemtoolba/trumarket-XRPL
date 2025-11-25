# trumarket-XRPL vs trumarket - Behavior Comparison

## Quick Answer

**Yes, `trumarket-XRPL` behaves the same as `trumarket` when `USE_XRPL=false` (or not set).**

`trumarket-XRPL` is the **same codebase** as `trumarket` with XRPL features added. It uses a feature flag to switch between EVM (original) and XRPL modes.

---

## Detailed Comparison

### 1. Codebase Relationship

| Aspect                  | trumarket (Original)       | trumarket-XRPL                     |
| ----------------------- | -------------------------- | ---------------------------------- |
| **Base Code**           | Original EVM-only codebase | Same codebase + XRPL features      |
| **Relationship**        | Standalone                 | Extended version with feature flag |
| **Backward Compatible** | N/A                        | ✅ Yes (when `USE_XRPL=false`)     |

### 2. Configuration Differences

**trumarket (Original):**

```typescript
// config.ts - No XRPL settings
export const config = {
  // ... standard config
  // No XRPL-related fields
};
```

**trumarket-XRPL:**

```typescript
// config.ts - Has XRPL settings
export const config = {
  // ... standard config (same as original)
  // PLUS XRPL settings:
  xrplServerUrl: process.env.XRPL_SERVER_URL || "...",
  xrplAdminSeed: process.env.XRPL_ADMIN_SEED || "",
  useXrpl: process.env.USE_XRPL === "true", // Feature flag
};
```

### 3. Behavioral Comparison

#### When `USE_XRPL=false` (or not set):

| Feature               | trumarket (Original)      | trumarket-XRPL                   |
| --------------------- | ------------------------- | -------------------------------- |
| **Vault Creation**    | ✅ DealVault.sol contract | ✅ DealVault.sol contract (same) |
| **Deal Creation**     | ✅ DealsManager.mint()    | ✅ DealsManager.mint() (same)    |
| **Deposits**          | ✅ Direct to DealVault    | ✅ Direct to DealVault (same)    |
| **Milestone Payouts** | ✅ DealVault transfers    | ✅ DealVault transfers (same)    |
| **Redemption**        | ✅ DealVault.redeem()     | ✅ DealVault.redeem() (same)     |
| **Frontend**          | ✅ EVM-only               | ✅ EVM-only (same)               |

**Result:** ✅ **Identical behavior** - Works exactly like original `trumarket`

#### When `USE_XRPL=true`:

| Feature               | trumarket (Original)   | trumarket-XRPL                         |
| --------------------- | ---------------------- | -------------------------------------- |
| **Vault Creation**    | DealVault.sol contract | XRPL Account (different)               |
| **Deal Creation**     | DealsManager.mint()    | XRPL NFT minting (different)           |
| **Deposits**          | Direct to DealVault    | Auto-detected → XRPL vault (different) |
| **Milestone Payouts** | DealVault transfers    | XRPL Payments (different)              |
| **Redemption**        | DealVault.redeem()     | XRPL burn + return (different)         |
| **Frontend**          | EVM-only               | EVM-only (same - XRPL is transparent)  |

**Result:** ⚠️ **Different behavior** - Uses XRPL instead of EVM smart contracts

---

## Code Flow Comparison

### Deal Creation Flow

**trumarket (Original):**

```typescript
// Always uses EVM
const txHash = await this.blockchain.mintNFT(...);
const vault = await this.blockchain.vault(nftID); // DealVault contract
```

**trumarket-XRPL (`USE_XRPL=false`):**

```typescript
// Same as original
if (!config.useXrpl) {
  const txHash = await this.blockchain.mintNFT(...);
  const vault = await this.blockchain.vault(nftID); // DealVault contract
}
```

**trumarket-XRPL (`USE_XRPL=true`):**

```typescript
// Uses XRPL instead
if (config.useXrpl) {
  const vaultWallet = this.xrpl.createDealVault(); // XRPL account
  // ... XRPL operations
}
```

### Deposit Flow

**trumarket (Original):**

```
Frontend → DealsManager.donateToDeal() → DealVault.donate()
```

**trumarket-XRPL (`USE_XRPL=false`):**

```
Frontend → DealsManager.donateToDeal() → DealVault.donate()
(Same as original)
```

**trumarket-XRPL (`USE_XRPL=true`):**

```
Frontend → DealsManager.donateToDeal() → DealVault.donate()
Backend → Auto-detects → Issues USD.IOU → Mints SHRx
(Backend mirrors to XRPL automatically)
```

---

## Key Differences Summary

### What's Added in trumarket-XRPL:

1. **XRPL Module** (`api/src/xrpl/`)

   - XrplService
   - XrplDepositService
   - XrplRedemptionService
   - XrplDepositDetectorService

2. **Feature Flag Logic**

   - `if (config.useXrpl)` checks throughout codebase
   - Conditional vault creation
   - Conditional milestone payouts

3. **Database Schema Extensions**

   - `Deal.xrplVaultAddress`
   - `Deal.xrplVaultSeed`
   - `Deal.xrplBorrowerAddress`
   - `User.xrplWalletAddress`
   - `User.xrplWalletSeed`

4. **Automatic Deposit Detection**
   - Scheduled job to detect USDC deposits
   - Automatically processes XRPL operations

### What Stays the Same:

1. **Frontend** - No changes (XRPL is transparent)
2. **API Endpoints** - Same endpoints, different backend behavior
3. **Database Structure** - Extended, not replaced
4. **EVM Mode** - Works exactly like original when `USE_XRPL=false`

---

## Migration Path

### From trumarket to trumarket-XRPL:

1. **Copy codebase** → `trumarket-XRPL`
2. **Add XRPL dependencies** → `npm install xrpl dotenv`
3. **Set `USE_XRPL=false`** → Behaves like original
4. **Test EVM mode** → Ensure backward compatibility
5. **Enable XRPL mode** → Set `USE_XRPL=true` when ready

### Backward Compatibility:

✅ **Fully backward compatible** when `USE_XRPL=false`:

- Same API endpoints
- Same database schema (XRPL fields optional)
- Same frontend code
- Same smart contracts
- Same behavior

---

## Testing Scenarios

### Scenario 1: EVM Mode (USE_XRPL=false)

```
✅ Should behave exactly like original trumarket
✅ All tests should pass
✅ No XRPL operations should occur
✅ DealVault contracts should be created
```

### Scenario 2: XRPL Mode (USE_XRPL=true)

```
✅ Should use XRPL for vault operations
✅ DealVault contracts NOT created
✅ XRPL accounts created instead
✅ Deposits auto-detected and processed
```

### Scenario 3: Switching Modes

```
✅ Can switch between modes via environment variable
✅ Existing EVM deals continue to work
✅ New deals use selected mode
✅ No data migration needed
```

---

## Conclusion

**`trumarket-XRPL` is a superset of `trumarket`:**

- ✅ **Same codebase** with XRPL features added
- ✅ **Backward compatible** when `USE_XRPL=false`
- ✅ **Behaves identically** to original in EVM mode
- ✅ **Adds XRPL capabilities** when `USE_XRPL=true`
- ✅ **No breaking changes** - original functionality preserved

**You can use `trumarket-XRPL` as a drop-in replacement for `trumarket` by simply not setting `USE_XRPL=true`.**
