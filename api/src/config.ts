export const config = {
  databaseUrl: process.env.DATABASE_URL || 'mongodb://mongo',
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
  prettyLogs: process.env.PRETTY_LOGS === 'true',
  logsDestination: process.env.LOGS_DESTINATION || '/app/logs/out.log',
  version: process.env.COMMIT_HASH || 'v0.0.0',
  s3Bucket: process.env.S3_BUCKET || 'api-bucket',
  awsEndpoint: process.env.AWS_ENDPOINT,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  jwtSecret: process.env.JWT_SECRET || 'yourjsonwebtokensecret',
  auth0Domain: process.env.AUTH0_DOMAIN || 'trumarket-dev.eu.auth0.com',
  blockchainRpcUrl:
    process.env.BLOCKCHAIN_RPC_URL || 'http://host.docker.internal:8545/',
  blockchainPrivateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  blockchainChainId: process.env.BLOCKCHAIN_CHAIN_ID || '',
  blockchainExplorer: process.env.BLOCKCHAIN_EXPLORER || '',
  dealsManagerContractAddress: process.env.DEALS_MANAGER_CONTRACT_ADDRESS || '',
  investmentTokenContractAddress:
    process.env.INVESTMENT_TOKEN_CONTRACT_ADDRESS || '',
  investmentTokenSymbol: process.env.INVESTMENT_TOKEN_SYMBOL || '',
  investmentTokenDecimals: process.env.INVESTMENT_TOKEN_DECIMALS || '',
  automaticDealsAcceptance: process.env.AUTOMATIC_DEALS_ACCEPTANCE === 'true',
  emailHost: process.env.EMAIL_HOST || '',
  emailUsername: process.env.EMAIL_USERNAME || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  appDomain: process.env.APP_DOMAIN || 'http://localhost:3000',
  mailTo: process.env.MAIL_TO,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  xrplServerUrl:
    process.env.XRPL_SERVER_URL || 'wss://s.altnet.rippletest.net:51233',
  xrplAdminSeed: process.env.XRPL_ADMIN_SEED || '',
  // Note: Vault and borrower seeds are no longer required in config
  // They are created per deal automatically
  useXrpl: process.env.USE_XRPL === 'true',
};
