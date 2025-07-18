-- 初期データベース設定

-- 拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- インデックス作成用の関数（パフォーマンス向上）
CREATE OR REPLACE FUNCTION create_index_if_not_exists(index_name text, table_name text, column_definition text)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = index_name AND n.nspname = current_schema()
    ) THEN
        EXECUTE format('CREATE INDEX %I ON %I %s', index_name, table_name, column_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- トピックテーブル
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    url TEXT,
    source_id VARCHAR(100),
    source_name VARCHAR(100),
    published_at TIMESTAMP WITH TIME ZONE,
    symbols TEXT[], -- 関連する暗号通貨シンボル
    keywords TEXT[], -- キーワード配列
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    score INTEGER DEFAULT 50,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 記事テーブル
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    template_id UUID,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    word_count INTEGER,
    published_at TIMESTAMP WITH TIME ZONE,
    slug VARCHAR(255) UNIQUE,
    tags TEXT[],
    seo_metadata JSONB DEFAULT '{}',
    generation_metadata JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 記事バージョンテーブル
CREATE TABLE IF NOT EXISTS article_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    changes_summary TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RSSソーステーブル
CREATE TABLE IF NOT EXISTS rss_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'rss',
    enabled BOOLEAN DEFAULT true,
    fetch_interval INTEGER DEFAULT 3600, -- 秒
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 記事テンプレートテーブル
CREATE TABLE IF NOT EXISTS article_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ジョブログテーブル
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255),
    queue_name VARCHAR(100),
    job_type VARCHAR(100),
    status VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    result JSONB,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
SELECT create_index_if_not_exists('idx_topics_status', 'topics', '(status)');
SELECT create_index_if_not_exists('idx_topics_created_at', 'topics', '(created_at DESC)');
SELECT create_index_if_not_exists('idx_topics_score', 'topics', '(score DESC)');
SELECT create_index_if_not_exists('idx_topics_symbols', 'topics', 'USING GIN (symbols)');
SELECT create_index_if_not_exists('idx_topics_keywords', 'topics', 'USING GIN (keywords)');
SELECT create_index_if_not_exists('idx_topics_source_id', 'topics', '(source_id)');

SELECT create_index_if_not_exists('idx_articles_status', 'articles', '(status)');
SELECT create_index_if_not_exists('idx_articles_created_at', 'articles', '(created_at DESC)');
SELECT create_index_if_not_exists('idx_articles_published_at', 'articles', '(published_at DESC)');
SELECT create_index_if_not_exists('idx_articles_topic_id', 'articles', '(topic_id)');
SELECT create_index_if_not_exists('idx_articles_user_id', 'articles', '(user_id)');
SELECT create_index_if_not_exists('idx_articles_slug', 'articles', '(slug)');
SELECT create_index_if_not_exists('idx_articles_tags', 'articles', 'USING GIN (tags)');

SELECT create_index_if_not_exists('idx_article_versions_article_id', 'article_versions', '(article_id, version DESC)');

SELECT create_index_if_not_exists('idx_rss_sources_enabled', 'rss_sources', '(enabled)');

SELECT create_index_if_not_exists('idx_job_logs_queue_status', 'job_logs', '(queue_name, status)');
SELECT create_index_if_not_exists('idx_job_logs_created_at', 'job_logs', '(created_at DESC)');

SELECT create_index_if_not_exists('idx_audit_logs_user_id', 'audit_logs', '(user_id)');
SELECT create_index_if_not_exists('idx_audit_logs_created_at', 'audit_logs', '(created_at DESC)');

-- 全文検索インデックス
SELECT create_index_if_not_exists('idx_topics_search', 'topics', 'USING GIN (to_tsvector(''english'', title || '' '' || COALESCE(description, '''']))');
SELECT create_index_if_not_exists('idx_articles_search', 'articles', 'USING GIN (to_tsvector(''english'', title || '' '' || content))');

-- 更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新トリガー作成
DO $$
BEGIN
    -- users
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- topics
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_topics_updated_at') THEN
        CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- articles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_articles_updated_at') THEN
        CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- rss_sources
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rss_sources_updated_at') THEN
        CREATE TRIGGER update_rss_sources_updated_at BEFORE UPDATE ON rss_sources
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- article_templates
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_article_templates_updated_at') THEN
        CREATE TRIGGER update_article_templates_updated_at BEFORE UPDATE ON article_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 初期データ挿入
INSERT INTO users (email, password_hash, name, role) VALUES 
    ('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj1/A/..', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO rss_sources (name, url, type, enabled) VALUES 
    ('CoinDesk', 'https://feeds.feedburner.com/CoinDesk', 'rss', true),
    ('Cointelegraph', 'https://cointelegraph.com/rss', 'rss', true),
    ('CryptoNews', 'https://cryptonews.com/news/feed/', 'rss', true)
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES 
    ('max_articles_per_day', '50', '1日あたりの最大記事生成数'),
    ('default_word_count_min', '600', 'デフォルト最小文字数'),
    ('default_word_count_max', '1000', 'デフォルト最大文字数'),
    ('article_generation_enabled', 'true', '記事生成機能の有効/無効'),
    ('topic_collection_interval', '3600', 'トピック収集間隔（秒）')
ON CONFLICT (key) DO NOTHING;

-- パフォーマンス統計更新
ANALYZE;