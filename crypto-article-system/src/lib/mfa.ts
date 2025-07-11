import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { encrypt, decrypt } from './encryption'

export interface MFASetupResult {
  secret: string
  qrCodeDataURL: string
  backupCodes: string[]
}

export interface MFAValidationResult {
  isValid: boolean
  error?: string
}

/**
 * MFA（多要素認証）セットアップ
 * @param userEmail ユーザーのメールアドレス
 * @param organizationName 組織名
 * @returns MFA設定情報
 */
export async function setupMFA(
  userEmail: string, 
  organizationName: string = 'Crypto Article System'
): Promise<MFASetupResult> {
  // TOTP シークレット生成
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: organizationName,
    length: 32
  })

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret')
  }

  // QRコード生成
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url)

  // バックアップコード生成（10個の6桁コード）
  const backupCodes = generateBackupCodes(10)

  return {
    secret: secret.base32,
    qrCodeDataURL,
    backupCodes
  }
}

/**
 * TOTP トークン検証
 * @param token ユーザーが入力したトークン
 * @param secret 暗号化されたシークレット
 * @param window 時間窓（デフォルト: 1 = 30秒前後まで許可）
 * @returns 検証結果
 */
export function verifyTOTP(
  token: string, 
  encryptedSecret: string,
  window: number = 1
): MFAValidationResult {
  try {
    // シークレットを復号化
    const secret = decrypt(encryptedSecret)
    
    // トークンの形式チェック（6桁の数字）
    if (!/^\d{6}$/.test(token)) {
      return {
        isValid: false,
        error: 'トークンは6桁の数字である必要があります'
      }
    }

    // TOTP検証
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window
    })

    return {
      isValid,
      error: isValid ? undefined : 'トークンが無効です'
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'MFA検証中にエラーが発生しました'
    }
  }
}

/**
 * バックアップコード検証
 * @param inputCode ユーザーが入力したコード
 * @param encryptedBackupCodes 暗号化されたバックアップコード配列
 * @returns 検証結果と残りのコード
 */
export function verifyBackupCode(
  inputCode: string,
  encryptedBackupCodes: string
): { isValid: boolean; remainingCodes?: string[]; error?: string } {
  try {
    // バックアップコードを復号化
    const backupCodesJson = decrypt(encryptedBackupCodes)
    const backupCodes: string[] = JSON.parse(backupCodesJson)

    // 入力されたコードがバックアップコードに含まれているかチェック
    const codeIndex = backupCodes.indexOf(inputCode.toUpperCase())
    
    if (codeIndex === -1) {
      return {
        isValid: false,
        error: 'バックアップコードが無効です'
      }
    }

    // 使用済みコードを削除
    const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex)

    return {
      isValid: true,
      remainingCodes
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'バックアップコード検証中にエラーが発生しました'
    }
  }
}

/**
 * バックアップコード生成
 * @param count 生成するコード数
 * @returns バックアップコード配列
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // 6桁のランダムな英数字コード生成
    const code = Math.random().toString(36).substr(2, 6).toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * MFAシークレットを暗号化
 * @param secret 生のシークレット
 * @returns 暗号化されたシークレット
 */
export function encryptMFASecret(secret: string): string {
  return encrypt(secret)
}

/**
 * バックアップコードを暗号化
 * @param backupCodes バックアップコード配列
 * @returns 暗号化されたバックアップコード
 */
export function encryptBackupCodes(backupCodes: string[]): string {
  return encrypt(JSON.stringify(backupCodes))
}

/**
 * MFA強制チェック
 * 組織の設定に基づいてMFAが必要かどうかを判定
 * @param userRole ユーザーの役割
 * @param organizationSettings 組織の設定
 * @returns MFAが必要かどうか
 */
export function isMFARequired(
  userRole: string,
  organizationSettings?: any
): boolean {
  // 管理者は常にMFA必須
  if (['OWNER', 'ADMIN'].includes(userRole)) {
    return true
  }

  // 組織設定でMFAが強制されている場合
  if (organizationSettings?.mfaRequired) {
    return true
  }

  return false
}

/**
 * MFA設定状況の検証
 * @param mfaEnabled MFAが有効かどうか
 * @param mfaSecret MFAシークレット
 * @returns MFA設定が完全かどうか
 */
export function validateMFASetup(
  mfaEnabled: boolean,
  mfaSecret?: string | null
): boolean {
  return mfaEnabled && !!mfaSecret
}