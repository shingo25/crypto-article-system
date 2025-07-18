
/* !!! This is code generated by Prisma. Do not edit directly. !!!
/* eslint-disable */

Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.11.0
 * Query Engine version: 9c30299f5a0ea26a96790e13f796dc6094db3173
 */
Prisma.prismaVersion = {
  client: "6.11.0",
  engine: "9c30299f5a0ea26a96790e13f796dc6094db3173"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  settings: 'settings',
  plan: 'plan',
  maxUsers: 'maxUsers',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrganizationMembershipScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  role: 'role',
  isActive: 'isActive',
  joinedAt: 'joinedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  username: 'username',
  password: 'password',
  firstName: 'firstName',
  lastName: 'lastName',
  avatar: 'avatar',
  role: 'role',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  emailVerified: 'emailVerified',
  emailVerifiedAt: 'emailVerifiedAt',
  preferences: 'preferences',
  mfaEnabled: 'mfaEnabled',
  mfaSecret: 'mfaSecret',
  mfaBackupCodes: 'mfaBackupCodes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  sessionToken: 'sessionToken',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.ArticleScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  title: 'title',
  content: 'content',
  summary: 'summary',
  slug: 'slug',
  status: 'status',
  authorId: 'authorId',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  tags: 'tags',
  keywords: 'keywords',
  sourceType: 'sourceType',
  sourceData: 'sourceData',
  generatedBy: 'generatedBy',
  templateId: 'templateId',
  publishedAt: 'publishedAt',
  scheduledAt: 'scheduledAt',
  viewCount: 'viewCount',
  shareCount: 'shareCount',
  engagementRate: 'engagementRate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TemplateScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  description: 'description',
  content: 'content',
  variables: 'variables',
  category: 'category',
  usageCount: 'usageCount',
  lastUsedAt: 'lastUsedAt',
  isActive: 'isActive',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ArticleVersionScalarFieldEnum = {
  id: 'id',
  articleId: 'articleId',
  version: 'version',
  title: 'title',
  content: 'content',
  changes: 'changes',
  createdAt: 'createdAt',
  authorId: 'authorId',
  changeType: 'changeType'
};

exports.Prisma.ArticleAnalyticsScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  articleId: 'articleId',
  date: 'date',
  views: 'views',
  uniqueViews: 'uniqueViews',
  shares: 'shares',
  comments: 'comments',
  avgReadTime: 'avgReadTime',
  bounceRate: 'bounceRate',
  engagementRate: 'engagementRate',
  trafficSources: 'trafficSources',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NewsItemScalarFieldEnum = {
  id: 'id',
  title: 'title',
  summary: 'summary',
  content: 'content',
  url: 'url',
  imageUrl: 'imageUrl',
  guid: 'guid',
  source: 'source',
  author: 'author',
  sentiment: 'sentiment',
  importance: 'importance',
  aiSummary: 'aiSummary',
  topics: 'topics',
  coins: 'coins',
  companies: 'companies',
  products: 'products',
  technology: 'technology',
  market: 'market',
  regulatory: 'regulatory',
  regions: 'regions',
  hasGeneratedArticle: 'hasGeneratedArticle',
  generatedArticleId: 'generatedArticleId',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RSSSourceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  category: 'category',
  description: 'description',
  enabled: 'enabled',
  lastCollected: 'lastCollected',
  totalCollected: 'totalCollected',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PriceAlertScalarFieldEnum = {
  id: 'id',
  coin: 'coin',
  alertType: 'alertType',
  condition: 'condition',
  isActive: 'isActive',
  message: 'message',
  autoGenerate: 'autoGenerate',
  templateId: 'templateId',
  lastTriggered: 'lastTriggered',
  triggerCount: 'triggerCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AlertTriggerScalarFieldEnum = {
  id: 'id',
  alertId: 'alertId',
  triggerData: 'triggerData',
  articleGenerated: 'articleGenerated',
  articleId: 'articleId',
  triggeredAt: 'triggeredAt'
};

exports.Prisma.PriceHistoryScalarFieldEnum = {
  id: 'id',
  symbol: 'symbol',
  name: 'name',
  price: 'price',
  volume: 'volume',
  marketCap: 'marketCap',
  rank: 'rank',
  change1h: 'change1h',
  change24h: 'change24h',
  change7d: 'change7d',
  timestamp: 'timestamp'
};

exports.Prisma.AlertHistoryScalarFieldEnum = {
  id: 'id',
  symbol: 'symbol',
  alertType: 'alertType',
  level: 'level',
  title: 'title',
  description: 'description',
  changePercent: 'changePercent',
  timeframe: 'timeframe',
  volume: 'volume',
  details: 'details',
  isActive: 'isActive',
  dismissed: 'dismissed',
  timestamp: 'timestamp'
};

exports.Prisma.MarketIndicatorsScalarFieldEnum = {
  id: 'id',
  totalMarketCap: 'totalMarketCap',
  btcDominance: 'btcDominance',
  fearGreedIndex: 'fearGreedIndex',
  totalVolume24h: 'totalVolume24h',
  timestamp: 'timestamp'
};

exports.Prisma.AlertSettingsScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  symbol: 'symbol',
  alertType: 'alertType',
  isEnabled: 'isEnabled',
  threshold: 'threshold',
  cooldownHours: 'cooldownHours',
  maxAlertsPerDay: 'maxAlertsPerDay',
  maxGlobalAlertsPerDay: 'maxGlobalAlertsPerDay',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AIProviderSettingsScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  userId: 'userId',
  provider: 'provider',
  apiKey: 'apiKey',
  model: 'model',
  temperature: 'temperature',
  maxTokens: 'maxTokens',
  topP: 'topP',
  frequencyPenalty: 'frequencyPenalty',
  presencePenalty: 'presencePenalty',
  advancedSettings: 'advancedSettings',
  isDefault: 'isDefault',
  isActive: 'isActive',
  lastUsed: 'lastUsed',
  lastModified: 'lastModified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemMetricsScalarFieldEnum = {
  id: 'id',
  date: 'date',
  articlesGenerated: 'articlesGenerated',
  templatesUsed: 'templatesUsed',
  newsProcessed: 'newsProcessed',
  alertsTriggered: 'alertsTriggered',
  apiRequests: 'apiRequests',
  aiTokensUsed: 'aiTokensUsed',
  systemUptime: 'systemUptime',
  avgResponseTime: 'avgResponseTime',
  errorCount: 'errorCount',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.MemberRole = exports.$Enums.MemberRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EDITOR: 'EDITOR',
  MEMBER: 'MEMBER'
};

exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  AUTHOR: 'AUTHOR',
  USER: 'USER'
};

exports.ArticleStatus = exports.$Enums.ArticleStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.SourceType = exports.$Enums.SourceType = {
  MANUAL: 'MANUAL',
  MARKET: 'MARKET',
  ALERT: 'ALERT',
  NEWS: 'NEWS',
  TEMPLATE: 'TEMPLATE',
  AI_SUGGESTED: 'AI_SUGGESTED'
};

exports.AlertType = exports.$Enums.AlertType = {
  PRICE_ABOVE: 'PRICE_ABOVE',
  PRICE_BELOW: 'PRICE_BELOW',
  PRICE_CHANGE: 'PRICE_CHANGE',
  VOLUME_SURGE: 'VOLUME_SURGE',
  TECHNICAL: 'TECHNICAL'
};

exports.AIProvider = exports.$Enums.AIProvider = {
  OPENAI: 'OPENAI',
  CLAUDE: 'CLAUDE',
  GEMINI: 'GEMINI'
};

exports.Prisma.ModelName = {
  Organization: 'Organization',
  OrganizationMembership: 'OrganizationMembership',
  User: 'User',
  UserSession: 'UserSession',
  Article: 'Article',
  Template: 'Template',
  ArticleVersion: 'ArticleVersion',
  ArticleAnalytics: 'ArticleAnalytics',
  NewsItem: 'NewsItem',
  RSSSource: 'RSSSource',
  PriceAlert: 'PriceAlert',
  AlertTrigger: 'AlertTrigger',
  PriceHistory: 'PriceHistory',
  AlertHistory: 'AlertHistory',
  MarketIndicators: 'MarketIndicators',
  AlertSettings: 'AlertSettings',
  AIProviderSettings: 'AIProviderSettings',
  SystemMetrics: 'SystemMetrics'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
