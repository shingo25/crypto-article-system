# セキュリティガイドライン

## 概要

このドキュメントは、暗号通貨記事自動生成システムのセキュリティ実装と運用ガイドラインについて説明します。

## 認証システム

### JWT認証
- **アルゴリズム**: HS256（本番環境ではRS256への移行を推奨）
- **アクセストークン有効期限**: 30分（デフォルト）
- **リフレッシュトークン有効期限**: 7日（デフォルト）

### パスワードポリシー
- 最小8文字
- 大文字、小文字、数字を必須含む
- bcryptによるハッシュ化（コストファクター: デフォルト）

### APIキー管理
- bcryptによるハッシュ化保存
- プレフィックス付き（`sk-`）
- 使用統計とレート制限機能

## セキュリティ対策

### 1. ブルートフォース攻撃対策
- ログイン失敗5回で30分間アカウントロック
- IPアドレスベースのレート制限
- ログイン試行の詳細ログ記録

### 2. SQLインジェクション対策
- SQLAlchemy ORMによるパラメータ化クエリ
- 生のSQLクエリの使用禁止

### 3. XSS対策
- Reactによる自動エスケープ
- `dangerouslySetInnerHTML`の使用禁止
- Content Security Policy（CSP）ヘッダー設定

### 4. CSRF対策
- JWT認証によるステートレス設計
- SameSite Cookieアトリビュート（リフレッシュトークン用）

### 5. セキュリティヘッダー
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

## 環境変数管理

### 必須環境変数
- `JWT_SECRET_KEY`: JWT署名用秘密鍵（**デフォルト値の使用厳禁**）

### 秘密鍵の生成方法
```bash
# 安全なランダム文字列の生成
openssl rand -hex 32
```

## 本番環境チェックリスト

- [ ] JWT_SECRET_KEYを強力なランダム値に設定
- [ ] HTTPS通信の強制
- [ ] TypeScriptとESLintのエラーチェック有効化
- [ ] データベースをPostgreSQLなどの本番用DBに移行
- [ ] Redisによるセッション管理の実装
- [ ] 依存関係の脆弱性スキャン実施
- [ ] ログ出力の機密情報フィルタリング
- [ ] バックアップとリカバリ手順の確立

## セキュリティ監査

### 定期的な確認項目
1. 依存関係の脆弱性（`npm audit`, `pip-audit`）
2. ログイン失敗パターンの分析
3. APIキー使用状況のモニタリング
4. 異常なトラフィックパターンの検知

### インシデント対応
1. 影響範囲の特定
2. 該当ユーザーへの通知
3. パスワード/APIキーのリセット
4. セキュリティパッチの適用
5. 再発防止策の実装

## 報告

セキュリティ脆弱性を発見した場合は、公開せずに以下に報告してください：
- メール: security@example.com
- 緊急度: High/Medium/Low を明記

## 更新履歴

- 2024-01-XX: 初版作成
- JWT認証システムの実装
- APIキー管理機能の追加
- ブルートフォース対策の強化