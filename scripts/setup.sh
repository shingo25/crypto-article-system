#!/bin/bash

# 暗号通貨記事生成システム セットアップスクリプト

set -e

echo "🚀 暗号通貨記事生成システムのセットアップを開始します..."

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 関数定義
print_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Pythonバージョンチェック
print_step "Pythonバージョンを確認中..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo "Python $PYTHON_VERSION が見つかりました"
    
    # Python 3.8以上かチェック
    if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
        print_success "Python バージョンは要件を満たしています"
    else
        print_error "Python 3.8以上が必要です"
        exit 1
    fi
else
    print_error "Python3が見つかりません"
    exit 1
fi

# 仮想環境の作成
print_step "Python仮想環境を作成中..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "仮想環境を作成しました"
else
    print_warning "仮想環境は既に存在します"
fi

# 仮想環境のアクティベート
print_step "仮想環境をアクティベート中..."
source venv/bin/activate
print_success "仮想環境をアクティベートしました"

# 依存関係のインストール
print_step "依存関係をインストール中..."
pip install --upgrade pip
pip install -r requirements.txt
print_success "依存関係のインストールが完了しました"

# 設定ファイルのコピー
print_step "設定ファイルをセットアップ中..."
if [ ! -f ".env" ]; then
    cp config/.env.example .env
    print_success ".envファイルを作成しました"
    print_warning "APIキーを設定するために .env ファイルを編集してください"
else
    print_warning ".envファイルは既に存在します"
fi

# 出力ディレクトリの作成
print_step "出力ディレクトリを作成中..."
mkdir -p output/articles output/logs
print_success "出力ディレクトリを作成しました"

# 権限設定
print_step "ファイル権限を設定中..."
chmod +x scripts/*.sh
chmod +x run_pipeline.py
print_success "実行権限を設定しました"

# 環境チェック
print_step "環境をテスト中..."
if python run_pipeline.py --help > /dev/null 2>&1; then
    print_success "基本動作確認が完了しました"
else
    print_error "環境テストに失敗しました"
    exit 1
fi

echo ""
echo "🎉 セットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. .env ファイルを編集してAPIキーを設定"
echo "2. デモを実行: python run_pipeline.py --demo"
echo "3. WordPress接続をテスト: python run_pipeline.py --test-wordpress"
echo ""
echo "詳細な使用方法については README.md を参照してください。"