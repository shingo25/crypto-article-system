#!/usr/bin/env python3
"""
設定データの暗号化・復号化・保存管理
Configuration data encryption, decryption, and storage management
"""

import os
import json
import base64
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """設定データの暗号化と管理を行うクラス"""
    
    def __init__(self, config_file: str = "config.enc", master_key: Optional[str] = None):
        self.config_file = config_file
        self.master_key = master_key or os.getenv('MASTER_KEY', self._generate_master_key())
        self._fernet = self._create_fernet()
        
    def _generate_master_key(self) -> str:
        """マスターキーを生成"""
        key = Fernet.generate_key()
        return base64.urlsafe_b64encode(key).decode()
    
    def _create_fernet(self) -> Fernet:
        """暗号化用のFernetインスタンスを作成"""
        # マスターキーから暗号化キーを導出
        password = self.master_key.encode()
        salt = b'crypto_article_system_salt'  # 固定のsalt（本番では動的に生成すべき）
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return Fernet(key)
    
    def encrypt_data(self, data: Dict[str, Any]) -> bytes:
        """データを暗号化"""
        try:
            json_data = json.dumps(data).encode()
            encrypted_data = self._fernet.encrypt(json_data)
            return encrypted_data
        except Exception as e:
            logger.error(f"Failed to encrypt data: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: bytes) -> Dict[str, Any]:
        """データを復号化"""
        try:
            decrypted_data = self._fernet.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt data: {e}")
            raise
    
    def save_config(self, config: Dict[str, Any]) -> bool:
        """設定を暗号化して保存"""
        try:
            # センシティブなキーのみ暗号化
            sensitive_keys = {
                'openai_api_key', 'gemini_api_key', 'wordpress_password',
                'coinmarketcap_api_key', 'database_password', 'secret_key'
            }
            
            # センシティブな設定とそうでない設定を分離
            sensitive_config = {}
            normal_config = {}
            
            for key, value in config.items():
                if key in sensitive_keys:
                    sensitive_config[key] = value
                else:
                    normal_config[key] = value
            
            # 設定ファイルの構造
            config_data = {
                'version': '1.0',
                'normal_config': normal_config,
                'encrypted_config': None
            }
            
            # センシティブな設定を暗号化
            if sensitive_config:
                encrypted_sensitive = self.encrypt_data(sensitive_config)
                config_data['encrypted_config'] = base64.b64encode(encrypted_sensitive).decode()
            
            # ファイルに保存
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Configuration saved to {self.config_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False
    
    def load_config(self) -> Dict[str, Any]:
        """暗号化された設定を復号化して読み込み"""
        try:
            if not os.path.exists(self.config_file):
                logger.warning(f"Config file {self.config_file} not found")
                return {}
            
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # 通常の設定を取得
            merged_config = config_data.get('normal_config', {})
            
            # 暗号化された設定を復号化
            encrypted_config_b64 = config_data.get('encrypted_config')
            if encrypted_config_b64:
                encrypted_data = base64.b64decode(encrypted_config_b64.encode())
                sensitive_config = self.decrypt_data(encrypted_data)
                merged_config.update(sensitive_config)
            
            logger.info(f"Configuration loaded from {self.config_file}")
            return merged_config
            
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}
    
    def update_config(self, updates: Dict[str, Any]) -> bool:
        """設定を部分的に更新"""
        try:
            # 既存の設定を読み込み
            current_config = self.load_config()
            
            # 更新内容をマージ
            current_config.update(updates)
            
            # 保存
            return self.save_config(current_config)
            
        except Exception as e:
            logger.error(f"Failed to update config: {e}")
            return False
    
    def delete_config_key(self, key: str) -> bool:
        """設定キーを削除"""
        try:
            current_config = self.load_config()
            if key in current_config:
                del current_config[key]
                return self.save_config(current_config)
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete config key {key}: {e}")
            return False
    
    def get_config_value(self, key: str, default: Any = None) -> Any:
        """特定の設定値を取得"""
        config = self.load_config()
        return config.get(key, default)
    
    def set_config_value(self, key: str, value: Any) -> bool:
        """特定の設定値を更新"""
        return self.update_config({key: value})
    
    def is_key_sensitive(self, key: str) -> bool:
        """キーがセンシティブかどうかを判定"""
        sensitive_keys = {
            'openai_api_key', 'gemini_api_key', 'wordpress_password',
            'coinmarketcap_api_key', 'database_password', 'secret_key'
        }
        return key in sensitive_keys
    
    def get_config_summary(self) -> Dict[str, Any]:
        """設定の概要を取得（センシティブな値は隠す）"""
        config = self.load_config()
        summary = {}
        
        for key, value in config.items():
            if self.is_key_sensitive(key):
                # センシティブな値は一部のみ表示
                if isinstance(value, str) and len(value) > 8:
                    summary[key] = f"{value[:4]}****{value[-4:]}"
                else:
                    summary[key] = "****"
            else:
                summary[key] = value
        
        return summary
    
    def backup_config(self, backup_file: Optional[str] = None) -> bool:
        """設定のバックアップを作成"""
        try:
            if backup_file is None:
                backup_file = f"{self.config_file}.backup"
            
            if os.path.exists(self.config_file):
                import shutil
                shutil.copy2(self.config_file, backup_file)
                logger.info(f"Config backed up to {backup_file}")
                return True
            else:
                logger.warning("No config file to backup")
                return False
                
        except Exception as e:
            logger.error(f"Failed to backup config: {e}")
            return False
    
    def restore_config(self, backup_file: str) -> bool:
        """設定をバックアップから復元"""
        try:
            if os.path.exists(backup_file):
                import shutil
                shutil.copy2(backup_file, self.config_file)
                logger.info(f"Config restored from {backup_file}")
                return True
            else:
                logger.error(f"Backup file {backup_file} not found")
                return False
                
        except Exception as e:
            logger.error(f"Failed to restore config: {e}")
            return False

# グローバルな設定マネージャーインスタンス
_config_manager = None

def get_config_manager() -> ConfigManager:
    """設定マネージャーのシングルトンインスタンスを取得"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager

def load_system_config() -> Dict[str, Any]:
    """システム設定を読み込み"""
    return get_config_manager().load_config()

def save_system_config(config: Dict[str, Any]) -> bool:
    """システム設定を保存"""
    return get_config_manager().save_config(config)

def update_system_config(updates: Dict[str, Any]) -> bool:
    """システム設定を更新"""
    return get_config_manager().update_config(updates)

def get_system_config_value(key: str, default: Any = None) -> Any:
    """システム設定値を取得"""
    return get_config_manager().get_config_value(key, default)

def set_system_config_value(key: str, value: Any) -> bool:
    """システム設定値を設定"""
    return get_config_manager().set_config_value(key, value)

# 設定値の検証
class ConfigValidator:
    """設定値の検証を行うクラス"""
    
    @staticmethod
    def validate_openai_key(api_key: str) -> bool:
        """OpenAI APIキーの形式を検証"""
        return isinstance(api_key, str) and api_key.startswith('sk-') and len(api_key) > 20
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """URLの形式を検証"""
        import re
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return url_pattern.match(url) is not None
    
    @staticmethod
    def validate_config(config: Dict[str, Any]) -> Dict[str, str]:
        """設定全体を検証し、エラーメッセージを返す"""
        errors = {}
        
        # OpenAI APIキー
        if 'openai_api_key' in config:
            if not ConfigValidator.validate_openai_key(config['openai_api_key']):
                errors['openai_api_key'] = 'Invalid OpenAI API key format'
        
        # WordPress URL
        if 'wordpress_url' in config:
            if not ConfigValidator.validate_url(config['wordpress_url']):
                errors['wordpress_url'] = 'Invalid WordPress URL format'
        
        # 数値の範囲チェック
        if 'max_articles_per_day' in config:
            try:
                value = int(config['max_articles_per_day'])
                if value < 1 or value > 1000:
                    errors['max_articles_per_day'] = 'Must be between 1 and 1000'
            except (ValueError, TypeError):
                errors['max_articles_per_day'] = 'Must be a valid number'
        
        return errors