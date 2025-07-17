#!/bin/sh

# ワーカープロセスのヘルスチェックスクリプト

WORKER_TYPE=${WORKER_TYPE:-"unknown"}
LOG_FILE="/app/logs/worker-${WORKER_TYPE}.log"
PID_FILE="/tmp/worker-${WORKER_TYPE}.pid"

# プロセスIDファイルが存在するかチェック
if [ ! -f "$PID_FILE" ]; then
    echo "PID file not found: $PID_FILE"
    exit 1
fi

# プロセスが実際に動作しているかチェック
PID=$(cat "$PID_FILE")
if ! kill -0 "$PID" 2>/dev/null; then
    echo "Process $PID is not running"
    exit 1
fi

# ログファイルが更新されているかチェック（過去5分以内）
if [ -f "$LOG_FILE" ]; then
    # ファイルの最終変更時刻を取得
    LAST_MODIFIED=$(stat -c %Y "$LOG_FILE" 2>/dev/null || stat -f %m "$LOG_FILE" 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))
    
    # 5分（300秒）以上更新されていない場合は異常
    if [ "$TIME_DIFF" -gt 300 ]; then
        echo "Log file not updated for $TIME_DIFF seconds"
        exit 1
    fi
fi

# Redisへの接続確認
if command -v redis-cli >/dev/null 2>&1; then
    REDIS_HOST=${REDIS_HOST:-"redis"}
    REDIS_PORT=${REDIS_PORT:-"6379"}
    
    if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        echo "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        exit 1
    fi
fi

# メモリ使用量チェック（オプション）
MEMORY_LIMIT_MB=${MEMORY_LIMIT_MB:-1024}
if [ -f "/proc/meminfo" ]; then
    MEMORY_USAGE=$(ps -p "$PID" -o rss= 2>/dev/null | tr -d ' ')
    if [ -n "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" -gt $((MEMORY_LIMIT_MB * 1024)) ]; then
        echo "Memory usage $MEMORY_USAGE KB exceeds limit"
        exit 1
    fi
fi

echo "Worker $WORKER_TYPE (PID: $PID) is healthy"
exit 0