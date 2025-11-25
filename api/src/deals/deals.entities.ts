import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export interface DocumentFile {
  id: string;
  description: string;
  url: string;
  seenByUsers: string[];
  seen: boolean;
  publiclyVisible: boolean;
}

export interface Wallet {
  address: string;
}

export class Milestone {
  @ApiProperty()
  @Expose()
  id?: string;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  fundsDistribution: number;

  @ApiProperty()
  @Expose()
  docs?: DocumentFile[];

  @ApiProperty()
  @Expose()
  status?: MilestoneStatus;

  @ApiProperty()
  @Expose()
  approvalStatus?: MilestoneApprovalStatus;
}

export enum DealStatus {
  Proposal = 'proposal',
  Confirmed = 'confirmed',
  Finished = 'finished',
  Repaid = 'repaid',
  Cancelled = 'cancelled',
}

export enum MilestoneStatus {
  InProgress = 'in progress',
  NotCompleted = 'not completed',
  Completed = 'completed',
}

export enum MilestoneApprovalStatus {
  Pending = 'pending',
  Submitted = 'submitted',
  Approved = 'approved',
  Denied = 'denied',
}

export class DealParticipant {
  id?: string;
  email: string;
  walletAddress?: string;
  approved?: boolean;
  new?: boolean;
}

export class DealCompany {
  name: string;
  country: string;
  taxId: string;
}

export class Deal {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  docs: DocumentFile[];
  carbonFootprint: string;

  // smart contract properties
  nftID: number;
  mintTxHash: string;
  vaultAddress: string;
  
  // XRPL-specific properties (when USE_XRPL=true)
  xrplVaultAddress?: string;
  xrplVaultSeed?: string; // Encrypted in production
  xrplBorrowerAddress?: string;
  xrplBorrowerSeed?: string; // Encrypted in production

  // shipping properties
  contractId: number;
  contractAddress: string;
  origin: string;
  destination: string;
  portOfOrigin: string;
  portOfDestination: string;
  transport: string;
  presentation: string;
  size: string;
  variety: string;
  quality: string;
  offerUnitPrice: number;
  quantity: number;
  totalValue: number;
  shippingStartDate: Date;
  expectedShippingEndDate: Date;
  duration: string;
  daysLeft: number;

  // state properties
  currentMilestone: number;
  milestones: Milestone[];
  status: DealStatus;
  isPublished: boolean;

  // financial properties
  investmentAmount: number;
  revenue: number;
  netBalance: number;
  roi: number;

  // ownership properties
  whitelist: Wallet[];
  buyers: DealParticipant[];
  suppliers: DealParticipant[];
  buyerCompany: DealCompany;
  supplierCompany: DealCompany;

  // ui helper properties
  newDocuments: boolean;
  new: boolean;

  createdAt: Date;
}

export interface DealLog {
  dealId: string;
  event: string;
  args: any;
  blockNumber: number;
  blockTimestamp: Date;
  txHash: string;
  message: string;
}
