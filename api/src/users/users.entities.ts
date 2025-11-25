export class Company {
  name: string;
  country: string;
  taxId: string;
}

export enum AccountType {
  Supplier = 'supplier',
  Buyer = 'buyer',
  Investor = 'investor',
}

export enum WalletType {
  EVM = 'evm',
  XRPL = 'xrpl',
}

export enum RoleType {
  REGULAR = 0,
  ADMIN = 1,
}

export class NotificationsSettings {
  assignedDeal: boolean;
  submittedDealChanges: boolean;
  confirmedDeal: boolean;
  cancelledDeal: boolean;
  completedDeal: boolean;
  // buyer
  buyerApprovedMilestone: boolean;
  buyerDeniedMilestone: boolean;
  // supplier
  supplierUploadedDocument: boolean;
  supplierDeletedDocument: boolean;
  supplierRequestedMilestoneApproval: boolean;
  supplierCancelledMilestoneApproval: boolean;
}

export class User {
  id: string;
  email: string;
  accountType: string;
  walletAddress: string;
  walletType: string;
  role: number;
  createdAt: Date;
  kycVerified: boolean;
  desktopNotifications?: NotificationsSettings;
  emailNotifications?: NotificationsSettings;

  // XRPL wallet (for investors when USE_XRPL=true)
  xrplWalletAddress?: string;
  xrplWalletSeed?: string; // Encrypted in production

  company?: Company;
}
