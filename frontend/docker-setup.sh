#!/bin/bash

# Docker環境セットアップスクリプト

set -e

# 色付きの出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 必要なコマンドのチェック
check_requirements() {
    log_info "必要なコマンドをチェック中..."
    
    local missing_commands=()
    
    if ! command -v docker &> /dev/null; then
        missing_commands+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_commands+=("docker-compose")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "以下のコマンドが見つかりません: ${missing_commands[*]}"
        log_error "https://docs.docker.com/get-docker/ からDockerをインストールしてください"
        exit 1
    fi
    
    log_success "必要なコマンドが揃っています"
}

# 環境変数ファイルのチェック
check_env_files() {
    log_info "環境変数ファイルをチェック中..."
    
    if [ ! -f ".env" ]; then
        log_warning ".envファイルが見つかりません。テンプレートから作成します..."
        cp .env.example .env
        log_warning ".envファイルを編集して、必要な設定を行ってください"
    fi
    
    if [ ! -f ".env.local" ]; then
        log_warning ".env.localファイルが見つかりません。必要に応じて作成してください"
    fi
    
    log_success "環境変数ファイルのチェック完了"
}

# Dockerネットワークの作成
create_networks() {
    log_info "Dockerネットワークを作成中..."
    
    # 開発環境用ネットワーク
    if ! docker network ls | grep -q "crypto-dev-network"; then
        docker network create crypto-dev-network --subnet=172.21.0.0/16
        log_success "開発環境用ネットワークを作成しました"
    else
        log_info "開発環境用ネットワークは既に存在します"
    fi
    
    # 本番環境用ネットワーク
    if ! docker network ls | grep -q "crypto-prod-network"; then
        docker network create crypto-prod-network --subnet=172.20.0.0/16
        log_success "本番環境用ネットワークを作成しました"
    else
        log_info "本番環境用ネットワークは既に存在します"
    fi
}

# Dockerボリュームの作成
create_volumes() {
    log_info "Dockerボリュームを作成中..."
    
    local volumes=(
        "postgres_data"
        "postgres_dev_data"
        "redis_data"
        "redis_dev_data"
        "app_logs"
        "nginx_logs"
        "prometheus_data"
        "grafana_data"
    )
    
    for volume in "${volumes[@]}"; do
        if ! docker volume ls | grep -q "$volume"; then
            docker volume create "$volume"
            log_success "ボリューム $volume を作成しました"
        else
            log_info "ボリューム $volume は既に存在します"
        fi
    done
}

# 開発環境の起動
start_dev() {
    log_info "開発環境を起動中..."
    
    # 依存関係のビルド
    docker-compose -f docker-compose.dev.yml build
    
    # サービスの起動
    docker-compose -f docker-compose.dev.yml up -d
    
    log_success "開発環境が起動しました"
    log_info "アプリケーション: http://localhost:3002"
    log_info "pgAdmin: http://localhost:8004 (dev@example.com / dev)"
    log_info "Redis Insight: http://localhost:8003"
    log_info "MailHog: http://localhost:8025"
}

# 本番環境の起動
start_prod() {
    log_info "本番環境を起動中..."
    
    # 依存関係のビルド
    docker-compose -f docker-compose.yml build
    
    # サービスの起動
    docker-compose -f docker-compose.yml up -d
    
    log_success "本番環境が起動しました"
    log_info "アプリケーション: http://localhost:3000"
    log_info "Grafana: http://localhost:3001"
    log_info "Prometheus: http://localhost:9090"
}

# データベースの初期化
init_database() {
    log_info "データベースを初期化中..."
    
    # PostgreSQLが起動するまで待機
    log_info "PostgreSQLの起動を待機中..."
    while ! docker-compose -f docker-compose.dev.yml exec postgres-dev pg_isready -U postgres; do
        sleep 1
    done
    
    # マイグレーション実行（実際のマイグレーションツールに応じて調整）
    # docker-compose -f docker-compose.dev.yml exec app-dev npm run db:migrate
    
    log_success "データベースの初期化が完了しました"
}

# ログの表示
show_logs() {
    local service=$1
    local env=${2:-dev}
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f "$service"
    else
        docker-compose -f docker-compose.yml logs -f "$service"
    fi
}

# 環境の停止
stop_env() {
    local env=${1:-dev}
    
    log_info "$env 環境を停止中..."
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose -f docker-compose.yml down
    fi
    
    log_success "$env 環境を停止しました"
}

# 環境のクリーンアップ
cleanup() {
    local env=${1:-dev}
    
    log_warning "$env 環境をクリーンアップ中（データも削除されます）..."
    
    if [ "$env" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    else
        docker-compose -f docker-compose.yml down -v --remove-orphans
    fi
    
    # 未使用のイメージとボリュームを削除
    docker system prune -f
    
    log_success "$env 環境のクリーンアップが完了しました"
}

# バックアップの作成
backup() {
    log_info "データベースをバックアップ中..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backup_${timestamp}.sql"
    
    docker-compose -f docker-compose.yml exec postgres pg_dump -U postgres crypto_articles > "backups/$backup_file"
    
    log_success "バックアップが作成されました: backups/$backup_file"
}

# ヘルプの表示
show_help() {
    cat << EOF
Docker環境セットアップスクリプト

使用方法:
    $0 [コマンド] [オプション]

コマンド:
    setup       初期セットアップを実行
    dev         開発環境を起動
    prod        本番環境を起動
    stop        環境を停止 [dev|prod]
    logs        ログを表示 [サービス名] [dev|prod]
    cleanup     環境をクリーンアップ [dev|prod]
    backup      データベースをバックアップ
    help        このヘルプを表示

例:
    $0 setup                    # 初期セットアップ
    $0 dev                      # 開発環境起動
    $0 logs app-dev             # アプリのログ表示
    $0 stop dev                 # 開発環境停止
    $0 cleanup prod             # 本番環境クリーンアップ

EOF
}

# メイン処理
main() {
    case "${1:-help}" in
        "setup")
            check_requirements
            check_env_files
            create_networks
            create_volumes
            log_success "セットアップが完了しました"
            ;;
        "dev")
            check_requirements
            start_dev
            ;;
        "prod")
            check_requirements
            start_prod
            ;;
        "stop")
            stop_env "${2:-dev}"
            ;;
        "logs")
            show_logs "${2:-app}" "${3:-dev}"
            ;;
        "cleanup")
            cleanup "${2:-dev}"
            ;;
        "backup")
            backup
            ;;
        "init-db")
            init_database
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# スクリプト実行
main "$@"