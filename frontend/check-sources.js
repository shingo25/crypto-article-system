const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkSources() {
  try {
    console.log('=== RSSソース状況 ===');
    
    const sources = await prisma.rSSSource.findMany();
    console.log('登録済みRSSソース数:', sources.length);
    
    sources.forEach((source, index) => {
      console.log(`\n${index + 1}. ${source.name}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   カテゴリ: ${source.category}`);
      console.log(`   有効: ${source.enabled ? 'Yes' : 'No'}`);
      console.log(`   ステータス: ${source.status}`);
      console.log(`   最終収集: ${source.lastCollected || 'なし'}`);
      console.log(`   収集数: ${source.totalCollected}`);
    });
    
    console.log('\n=== ニュース記事状況 ===');
    const newsCount = await prisma.newsItem.count();
    console.log('総ニュース記事数:', newsCount);
    
    const sourceStats = await prisma.newsItem.groupBy({
      by: ['source'],
      _count: {
        id: true
      }
    });
    
    console.log('\nソース別記事数:');
    sourceStats.forEach(stat => {
      console.log(`- ${stat.source}: ${stat._count.id}件`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSources();