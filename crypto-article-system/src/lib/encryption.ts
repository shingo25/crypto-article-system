import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 環境変数から暗号化キーを取得
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Base64でエンコードされたキーをBufferに変換
  return Buffer.from(key, 'base64');
}

/**
 * 文字列を暗号化
 * @param text 暗号化する文字列
 * @returns 暗号化されたデータ（Base64形式）
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  
  // ランダムな初期化ベクトル（IV）を生成
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // 暗号化器を作成
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // テキストを暗号化
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  // 認証タグを取得
  const tag = cipher.getAuthTag();
  
  // IV + 認証タグ + 暗号化データを結合してBase64エンコード
  const combined = Buffer.concat([iv, tag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * 暗号化されたデータを復号
 * @param encryptedData Base64形式の暗号化データ
 * @returns 復号されたテキスト
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  
  // Base64デコード
  const combined = Buffer.from(encryptedData, 'base64');
  
  // IV、認証タグ、暗号化データを分離
  const iv = combined.slice(0, IV_LENGTH);
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
  
  // 復号器を作成
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  // データを復号
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * APIキーをマスク表示用に変換
 * @param apiKey 元のAPIキー
 * @returns マスクされたAPIキー（例: sk-...1234）
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }
  
  const prefix = apiKey.slice(0, 3);
  const suffix = apiKey.slice(-4);
  
  return `${prefix}...${suffix}`;
}

/**
 * 暗号化キーの生成（初期設定用）
 * @returns Base64エンコードされた暗号化キー
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}