// Auth DTO（手动校验，不引入 class-validator 依赖）。
export interface RegisterDto {
  phone: string
  name: string
  password: string
  securityQuestion: string
  securityAnswer: string
}

export interface LoginDto {
  phone: string
  password: string
}

export interface RecoverDto {
  phone: string
  name: string
  securityQuestion: string
  securityAnswer: string
  newPassword: string
}

export interface RefreshDto {
  refreshToken: string
}

export interface SendSmsDto {
  phone: string
  scene: 'register' | 'reset'
}

export interface SmsRegisterDto {
  phone: string
  name: string
  code: string
  password: string
}

export interface SmsResetDto {
  phone: string
  code: string
  newPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
