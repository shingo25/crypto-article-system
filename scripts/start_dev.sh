#!/bin/bash

# 開発環境起動スクリプト
# バックエンドとフロントエンドを同時に起動

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 暗号通貨記事生成システム - 開発環境を起動中..."

# プロジェクトディレクトリに移動
cd "$PROJECT_DIR"

# バックエンドの準備確認
if [ ! -f "venv/bin/activate" ]; then
    echo "❌ Python仮想環境が見つかりません。setup.shを先に実行してください。"
    exit 1
fi

# Node.jsの準備確認
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Node.js依存関係をインストール中..."
    cd frontend
    npm install
    cd ..
fi

# 環境変数ファイルの確認
if [ ! -f ".env" ]; then
    echo "⚠️  .envファイルが見つかりません。config/.env.exampleからコピーしてください。"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "📝 フロントエンド用環境変数を作成中..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
fi

# tmuxが利用可能か確認
if command -v tmux &> /dev/null; then
    echo "🔧 tmuxを使用してセッションを作成します..."
    
    # 既存のセッションを終了
    tmux kill-session -t crypto-dev 2>/dev/null || true
    
    # 新しいセッションを作成
    tmux new-session -d -s crypto-dev
    
    # バックエンド用のウィンドウ
    tmux rename-window -t crypto-dev:0 'backend'
    tmux send-keys -t crypto-dev:0 "cd $PROJECT_DIR" C-m
    tmux send-keys -t crypto-dev:0 "source venv/bin/activate" C-m
    tmux send-keys -t crypto-dev:0 "echo '🔥 バックエンドAPIサーバーを起動中...'" C-m
    tmux send-keys -t crypto-dev:0 "cd backend && PYTHONPATH=. python src/main.py" C-m
    
    # フロントエンド用のウィンドウ
    tmux new-window -t crypto-dev:1 -n 'frontend'
    tmux send-keys -t crypto-dev:1 "cd $PROJECT_DIR/frontend" C-m
    tmux send-keys -t crypto-dev:1 "echo '⚡ フロントエンドを起動中...'" C-m
    tmux send-keys -t crypto-dev:1 "sleep 3" C-m  # バックエンドの起動を待つ
    tmux send-keys -t crypto-dev:1 "npm run dev" C-m
    
    # ログ用のウィンドウ
    tmux new-window -t crypto-dev:2 -n 'logs'
    tmux send-keys -t crypto-dev:2 "cd $PROJECT_DIR" C-m
    tmux send-keys -t crypto-dev:2 "echo '📊 ログ監視 - tail -f output/logs/*.log でログを確認できます'" C-m
    
    # tmuxセッションにアタッチ
    echo ""
    echo "✅ 開発環境が起動しました！"
    echo ""
    echo "📱 フロントエンド: http://localhost:3000"
    echo "🔧 バックエンドAPI: http://localhost:8000"
    echo "📚 API文書: http://localhost:8000/docs"
    echo ""
    echo "tmuxセッション 'crypto-dev' に接続します..."
    echo "Ctrl+b → d で一時的にデタッチできます"
    echo "Ctrl+b → & でセッションを終了できます"
    echo ""
    
    sleep 2
    tmux attach-session -t crypto-dev
    
else
    echo "⚠️  tmuxが見つかりません。個別に起動してください："
    echo ""
    echo "ターミナル1 (バックエンド):"
    echo "  cd $PROJECT_DIR"
    echo "  source venv/bin/activate"
    echo "  cd backend && PYTHONPATH=. python src/main.py"
    echo ""
    echo "ターミナル2 (フロントエンド):"
    echo "  cd $PROJECT_DIR/frontend"
    echo "  npm run dev"
    echo ""
    echo "tmuxをインストールすると自動起動できます："
    echo "  # macOS: brew install tmux"
    echo "  # Ubuntu: sudo apt install tmux"
fi