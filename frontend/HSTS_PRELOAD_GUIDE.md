# HSTS Preload List 登録ガイド

このドキュメントは、本プロジェクトを HSTS Preload List に登録するための手順を説明します。

## 概要

HSTS (HTTP Strict Transport Security) Preload List に登録することで、ブラウザは最初のアクセスから常にHTTPS接続を行い、セキュリティが大幅に向上します。

## 現在の実装状況

### ✅ 実装済み
- HSTS ヘッダーの設定 (`max-age=31536000; includeSubDomains; preload`)
- 本番環境でのHTTPS強制
- セキュアクッキー設定

### 📋 登録前チェックリスト

1. **HTTPS証明書の設定確認**
   - 有効なSSL/TLS証明書が設定されている
   - 全サブドメインでHTTPS対応が完了している

2. **HSTSヘッダーの確認**
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

3. **リダイレクト設定の確認**
   - HTTPからHTTPSへの自動リダイレクト
   - www有無の統一

## 登録手順

### Step 1: 事前テスト

1. **HSTSヘッダーの動作確認**
   ```bash
   curl -I https://yourdomain.com
   ```
   
   レスポンスに以下が含まれることを確認：
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

2. **SSL Labs テスト**
   https://www.ssllabs.com/ssltest/ でA+評価を確認

3. **セキュリティヘッダーテスト**
   https://securityheaders.com/ でテスト実行

### Step 2: HSTS Preload 登録

1. **登録サイトにアクセス**
   https://hstspreload.org/

2. **ドメイン入力と検証**
   - ドメイン名を入力
   - 自動検証の結果を確認

3. **要件の確認**
   - ✅ HSTSヘッダーが正しく設定されている
   - ✅ `max-age` が最低18週間（31536000秒）以上
   - ✅ `includeSubDomains` ディレクティブが含まれている
   - ✅ `preload` ディレクティブが含まれている
   - ✅ HTTPからHTTPSへのリダイレクトが機能している

4. **登録申請**
   - チェックボックスにチェック
   - 「Submit」ボタンをクリック

### Step 3: 登録後の確認

1. **反映確認**
   - 登録から反映まで数週間～数ヶ月かかる場合があります
   - Chrome の chrome://net-internals/#hsts で確認可能

2. **継続監視**
   - HSTSヘッダーを削除しないよう注意
   - SSL証明書の期限管理

## 注意事項

### ⚠️ 重要な警告

1. **一度登録すると削除が困難**
   - Preload Listからの削除は非常に時間がかかります
   - 本番環境での十分なテストが必要

2. **全サブドメインに影響**
   - `includeSubDomains` により全サブドメインでHTTPS必須
   - サブドメインの準備が完了してから登録

3. **証明書管理の重要性**
   - SSL証明書の期限切れは重大な問題
   - 自動更新の設定を強く推奨

## トラブルシューティング

### 問題: HSTSヘッダーが検出されない
- ブラウザキャッシュのクリア
- CDNキャッシュのクリア
- サーバー設定の再確認

### 問題: サブドメインでエラー
- 全サブドメインでHTTPS設定を確認
- ワイルドカード証明書の使用を検討

## 環境別設定

### 開発環境
- HSTS Preloadは無効（開発用HTTP接続のため）
- テスト用の設定でCSPポリシーを緩和

### 本番環境
- 完全なHSTS設定
- 厳格なCSPポリシー
- SSL証明書の自動更新

## 参考資料

- [HSTS Preload List Official Site](https://hstspreload.org/)
- [MDN HSTS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Chrome HSTS Preload List](https://chromium.googlesource.com/chromium/src/+/master/net/http/transport_security_state_static.json)

## チェックリスト

登録前に以下を確認してください：

- [ ] SSL証明書が有効で自動更新設定済み
- [ ] 全サブドメインでHTTPS対応完了
- [ ] HSTSヘッダーが正しく設定されている
- [ ] HTTPからHTTPSへのリダイレクト動作確認
- [ ] SSL Labs でA+評価取得
- [ ] セキュリティヘッダーテストでA+評価取得
- [ ] 本番環境での十分なテスト完了
- [ ] チーム全体での合意形成