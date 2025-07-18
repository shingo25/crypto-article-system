const Parser = require('rss-parser');

async function testRSS() {
  const parser = new Parser();
  
  try {
    console.log('CoinDeskのRSSフィードをテスト中...');
    const feed = await parser.parseURL('https://www.coindesk.com/arc/outboundfeeds/rss/');
    
    console.log('フィード情報:');
    console.log('- タイトル:', feed.title);
    console.log('- 説明:', feed.description);
    console.log('- アイテム数:', feed.items.length);
    
    if (feed.items.length > 0) {
      console.log('\n最初の記事:');
      const firstItem = feed.items[0];
      console.log('- タイトル:', firstItem.title);
      console.log('- リンク:', firstItem.link);
      console.log('- 公開日:', firstItem.pubDate);
      console.log('- 概要:', firstItem.contentSnippet ? firstItem.contentSnippet.substring(0, 100) + '...' : 'なし');
    }
    
  } catch (error) {
    console.error('RSSフィード取得エラー:', error.message);
  }
}

testRSS();