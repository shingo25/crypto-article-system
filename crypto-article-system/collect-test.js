const { PrismaClient } = require('./src/generated/prisma');
const Parser = require('rss-parser');

const prisma = new PrismaClient();

async function collectNews() {
  try {
    console.log('RSSソースを取得中...');
    const sources = await prisma.rSSSource.findMany({
      where: { enabled: true }
    });
    
    console.log('取得したソース数:', sources.length);
    
    if (sources.length === 0) {
      console.log('有効なRSSソースがありません');
      return;
    }
    
    const parser = new Parser();
    
    for (const source of sources) {
      try {
        console.log(`\n${source.name} からニュースを収集中...`);
        const feed = await parser.parseURL(source.url);
        
        console.log(`- フィードタイトル: ${feed.title}`);
        console.log(`- 記事数: ${feed.items.length}`);
        
        let savedCount = 0;
        
        for (const item of feed.items) {
          try {
            // 重複チェック
            const existing = await prisma.newsItem.findFirst({
              where: { url: item.link }
            });
            
            if (existing) {
              continue;
            }
            
            // ニュースアイテムを保存
            await prisma.newsItem.create({
              data: {
                title: item.title || 'Untitled',
                summary: item.contentSnippet || item.content || '',
                content: item.content,
                url: item.link,
                guid: item.guid || item.link,
                source: source.name,
                author: item.author,
                sentiment: 0,
                importance: 5,
                topics: ['crypto', 'news'],
                coins: [],
                hasGeneratedArticle: false,
                publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
              }
            });
            
            savedCount++;
          } catch (saveError) {
            console.error(`記事保存エラー: ${saveError.message}`);
          }
        }
        
        console.log(`- 保存した記事数: ${savedCount}`);
        
        // ソースの統計を更新
        await prisma.rSSSource.update({
          where: { id: source.id },
          data: {
            lastCollected: new Date(),
            totalCollected: { increment: savedCount },
            status: 'active'
          }
        });
        
      } catch (sourceError) {
        console.error(`ソース ${source.name} のエラー:`, sourceError.message);
      }
    }
    
    // 結果を確認
    const totalNews = await prisma.newsItem.count();
    console.log(`\n✅ 収集完了。総ニュース数: ${totalNews}`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

collectNews();