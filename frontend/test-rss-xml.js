const Parser = require('rss-parser');

async function testXMLRSS() {
  const parser = new Parser();
  
  try {
    console.log('XML RSSフィードをテスト中...');
    const feed = await parser.parseURL('https://rss.app/feeds/K7a1Hs7ikGh6e054.xml');
    
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
      console.log('- GUID:', firstItem.guid);
      console.log('- 概要:', firstItem.contentSnippet ? firstItem.contentSnippet.substring(0, 100) + '...' : 'なし');
      
      console.log('\n全記事のタイトル:');
      feed.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
      });
    }
    
  } catch (error) {
    console.error('XMLフィード取得エラー:', error.message);
    console.error('エラー詳細:', error);
  }
}

testXMLRSS();