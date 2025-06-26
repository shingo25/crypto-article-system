#!/bin/bash

# 日次実行スクリプト
# cron で使用するためのスクリプト
# 例: 0 9 * * * /path/to/crypto-article-system/scripts/daily_run.sh

set -e

# スクリプトの場所を取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ログファイル
LOG_FILE="$PROJECT_DIR/output/logs/daily_run_$(date +%Y%m%d).log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "日次記事生成を開始します..."

# プロジェクトディレクトリに移動
cd "$PROJECT_DIR"

# 仮想環境をアクティベート
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    log "仮想環境をアクティベートしました"
else
    log "ERROR: 仮想環境が見つかりません"
    exit 1
fi

# 環境変数を読み込み
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    log ".env ファイルを読み込みました"
else
    log "WARNING: .env ファイルが見つかりません"
fi

# パイプラインを実行
log "記事生成パイプラインを実行中..."
if python run_pipeline.py --once --enable-fact-check 2>&1 | tee -a "$LOG_FILE"; then
    log "記事生成が正常に完了しました"
    
    # WordPress投稿が有効な場合は投稿
    if [ "$ENABLE_WORDPRESS_POST" = "true" ]; then
        log "WordPress投稿を実行中..."
        if python run_pipeline.py --test-wordpress 2>&1 | tee -a "$LOG_FILE"; then
            # 投稿処理をここに追加
            log "WordPress投稿処理が完了しました"
        else
            log "WARNING: WordPress投稿に問題があります"
        fi
    fi
else
    log "ERROR: 記事生成中にエラーが発生しました"
    exit 1
fi

# 古いログファイルを削除（30日以上古いもの）
find "$PROJECT_DIR/output/logs" -name "daily_run_*.log" -mtime +30 -delete 2>/dev/null || true
log "古いログファイルを削除しました"

# 統計情報を記録
ARTICLES_COUNT=$(find "$PROJECT_DIR/output/articles" -name "*.html" -newer "$PROJECT_DIR/output/logs/last_run_timestamp" 2>/dev/null | wc -l || echo "0")
log "本日生成された記事数: $ARTICLES_COUNT"

# タイムスタンプを更新
touch "$PROJECT_DIR/output/logs/last_run_timestamp"

log "日次実行が完了しました"

# Slack通知（オプション）
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"📰 暗号通貨記事システム: 本日 $ARTICLES_COUNT 件の記事を生成しました\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || true
fi