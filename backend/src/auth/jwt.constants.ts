// JWT 时效配置（密钥改由 ConfigService 注入，避免导入期读取 .env 尚未加载的问题）。
export const ACCESS_TTL = '15m'
export const REFRESH_TTL = '7d'

// 仅用于本地开发（NODE_ENV !== 'production'）的回退值；生产环境会在启动期校验中拒绝。
export const DEV_ACCESS_SECRET = 'dev-access-secret-change-me'
export const DEV_REFRESH_SECRET = 'dev-refresh-secret-change-me'
