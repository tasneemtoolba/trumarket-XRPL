# TruMarket – XRPL Migration (Demo Day Technical Architecture)

## 1. Overview

This document outlines TruMarket's transition from an EVM-based vault to an XRPL-native settlement and vault layer. It includes updated reasoning, flow diagrams, XRPL vault definition, cross-chain blockers, roadmap, and Demo Day requirements.

---

## 2. Legacy Architecture (Before XRPL)

```
Investor Login (Privy)
↓
EVM Wallet (USDC)
↓
Deposit to EVM Treasury
↓
Solidity Vault (ERC4626)
↓
Solidity Milestone Payouts
↓
Borrower wallet (then Off-chain)
```

### Key Issues:

- Complex Solidity vault (1200+ lines).
- High smart contract attack surface.
- No multi-currency capabilities.
- Off-chain borrower settlements.
- Expensive audits, slow iteration.

---

## 3. New XRPL-Native Architecture (Chosen Direction)

TruMarket now uses XRPL as the **settlement engine** for all vault operations, payouts, and accounting.

```
Investor Login (Privy) → EVM Wallet (USDC)
↓
Backend detects deposit
↓
Backend issues USD.IOU → XRPL Vault
↓
Backend mints SHRx shares → Investor XRPL wallet
↓
Milestone payouts → Borrower XRPL Wallet (USD.IOU)
↓
Redemption: Burn SHRx → Backend returns USDC on EVM
```

### Why XRPL?

- Eliminates Solidity vault (no code = no exploit).
- Uses deterministic ledger primitives.
- Native Issued Currencies (IOUs) for accounting.
- Native Payments for settlement.
- Multi-currency payouts via AMM or Pathfinding.
- True global reach for exporters.

---

## 4. What is the "XRPL Vault"?

XRPL has **no smart contract vault primitive**.  
We replicate vault functionality using XRPL-native components:

### XRPL Vault =

✔ An XRPL Account  
✔ Holding a USD.IOU trustline  
✔ Controlled by issuer/treasury  
✔ Receives USD.IOU when investors deposit  
✔ Sends milestone payouts via XRPL Payment  
✔ Fully transparent and immune to smart-contract attack vectors

### Why this is safer:

No:

- Reentrancy
- Integer math bugs
- State desync
- Inflation exploits
- Complex share math
- Upgrade logic failures

XRPL ledger rules enforce all invariants.

---

## 5. What XRPL Features We Use

- **Issued Currencies (IOUs)**: USD.IOU, SHRx (shares)
- **Trustlines**
- **XRPL Payments**
- **AccountLines API**
- **Pathfinding (future AMM payouts)**
- **XRPL Accounts for vault/issuer/borrower/investor**

---

## 6. Cross-Chain Architecture (EVM ↔ XRPL)

TruMarket backend mirrors deposits:

1. Investor deposits USDC on EVM.
2. Backend issues USD.IOU to XRPL Vault.
3. Backend mints SHRx shares to investor XRPL wallet.
4. Milestones trigger XRP Ledger payments.
5. Redemption burns SHRx and backend returns USDC to investor.

This avoids bridges AND smart contracts.

---

## 7. Blockers

### 1. USDC ↔ USD.IOU Synchronization

Backend must ensure:

- No double issuance
- No mismatch between chains
- No balance drift

### 2. Redemption Logic

Burn SHRx → return USD.IOU → return USDC on EVM.

### 3. Custodial XRPL Wallet Creation

Backend must:

- Create XRPL wallets for investors
- Set trustlines
- Manage issuing and burning

### 4. FX + Off-Ramping

Using:

- XRPL AMM pathfinding
- Third-party partners (Iron, etc.)

---

## 8. Updated Roadmap

### Before Demo Day

- Finalize redemption flow.
- Integrate XRPL vault into frontend.
- Full Testnet demo (investor → vault → borrower).
- Recorded fallback demo.

### After Grant (1–2 Months)

- Integrate **Iron** for African payout rails.
- Integrate global off-ramp providers that support XRPL.
- Enable payouts in NGN, KES, ZAR, EGP, PHP, MXN via partners.
- Implement XRPL AMM for local currency settlement.
- Reduce dependency on EVM treasury.

### Long-Term (Full XRPL Migration)

- Entire vault + settlement moves to XRPL.
- EVM layer becomes optional (only for USDC onboarding if needed).
- Potential use of RLUSD once live.
- Eventually eliminate EVM completely.

---

## 9. Why we eliminated the Solidity Vault

The old vault:

- Was complex (1200+ lines).
- Had custom share math and milestone logic.
- Could be exploited (like most DeFi vault hacks).
- Was expensive to audit and maintain.
- Introduced systemic risk.

### XRPL fixed all of this:

- No smart contracts.
- Deterministic ledger.
- No arbitrary user code.
- All operations are strictly defined and safe.

Using XRPL **directly aligns with its purpose**:

- Settlement
- Multi-currency
- FX & AMM
- Cross-border trade finance

---

## 10. Demo Day Checklist

### Technical Demo:

- ✔ Current architecture
- ✔ XRPL migration architecture
- ✔ Vault + shares + milestone payouts
- ✔ Live XRPL Testnet demo
- ✔ Roadmap & blockers

### Investor Pitch:

- Problem: exporters need fast financing
- Market: $5T global trade finance gap
- Traction: MVP + XRPL live
- Why XRPL: safe, global, multi-currency
- Team: credible, technical
- Ask: Funding + strategic partnership (Ripple, payment partners)

---

## 11. Integration Partnerships

We are currently working on initial integration and partnership discussions with **Iron** and other cross‑border payment providers.  
These partners will enable:

- Local currency payouts
- Stable off-ramping
- Direct settlement rails into Africa, MENA, SEA, LatAm

Once this integration is complete, we will **eliminate the remaining dependency on EVM** and operate fully on XRPL.

---

## 12. Implementation

### XRPL Service

The XRPL functionality has been integrated into the API as a NestJS module:

- `api/src/xrpl/xrpl.module.ts` - XRPL module
- `api/src/xrpl/xrpl.service.ts` - XRPL service with all operations

### Scripts

Utility scripts are available in `api/scripts/xrpl/`:

- `setup-wallets.ts` - Generate new wallets
- `issue-token.ts` - Setup trustlines
- `fund-vault.ts` - Fund vault with USD IOU
- `mint-deal-nft.ts` - Mint deal NFT
- `check-vault-balance.ts` - Check vault balance
- `show-deal.ts` - Show deal state
- `proceed-milestone.ts` - Proceed with milestone payout

### Configuration

Add these environment variables:

- `XRPL_SERVER_URL` - XRPL server URL (default: testnet)
- `XRPL_ADMIN_SEED` - Admin wallet seed
- `XRPL_VAULT_SEED` - Vault wallet seed
- `XRPL_BORROWER_SEED` - Borrower wallet seed

This README provides the complete Demo Day technical foundation.
