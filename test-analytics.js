// test-analytics.js - Test analytics calculations
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const analytics = require('./dashboard/analytics');

const dbPath = path.join(__dirname, 'test-server_123456789_2024-01-01_00-00-00.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log('Testing analytics calculations...\n');

// Test date ranges
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

async function runTests() {
  try {
    // Test DAU
    console.log('1. Testing DAU (Daily Active Users)...');
    const dau = await analytics.getDAU(db, oneDayAgo, now);
    console.log(`   DAU: ${dau.count} users`);
    
    // Test WAU
    console.log('\n2. Testing WAU (Weekly Active Users)...');
    const wau = await analytics.getWAU(db, oneWeekAgo, now);
    console.log(`   WAU: ${wau.count} users`);
    
    // Test MAU
    console.log('\n3. Testing MAU (Monthly Active Users)...');
    const mau = await analytics.getMAU(db, oneMonthAgo, now);
    console.log(`   MAU: ${mau.count} users`);
    
    // Test Overall Stats
    console.log('\n4. Testing Overall Statistics...');
    const overall = await analytics.getOverallStats(db, oneWeekAgo, now);
    console.log(`   Total Messages: ${overall.totalMessages}`);
    console.log(`   Unique Users: ${overall.uniqueUsers}`);
    console.log(`   Active Channels: ${overall.activeChannels}`);
    console.log(`   Total Characters: ${overall.totalCharacters}`);
    console.log(`   Avg Message Length: ${Math.round(overall.avgMessageLength)} chars`);
    
    // Test Channel Activity
    console.log('\n5. Testing Channel Activity...');
    const channels = await analytics.getMessagingActivityByChannel(db, oneWeekAgo, now);
    console.log(`   Found ${channels.length} active channels`);
    if (channels.length > 0) {
      console.log(`   Top channel: ${channels[0].channelName || channels[0].channelId} (${channels[0].messageCount} messages)`);
    }
    
    // Test Category Activity
    console.log('\n6. Testing Category Activity...');
    const categories = await analytics.getMessagingActivityByCategory(db, oneWeekAgo, now);
    console.log(`   Found ${categories.length} active categories`);
    if (categories.length > 0) {
      console.log(`   Top category: ${categories[0].categoryName || 'Uncategorized'} (${categories[0].messageCount} messages)`);
    }
    
    // Test Top Users
    console.log('\n7. Testing Top Users...');
    const topUsers = await analytics.getTopUsers(db, oneWeekAgo, now, 5);
    console.log(`   Found ${topUsers.length} users`);
    topUsers.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.authorUsername}: ${user.messageCount} messages, ${user.totalCharacters} chars`);
    });
    
    // Test Character Count by User
    console.log('\n8. Testing Character Count Statistics...');
    const charStats = await analytics.getCharacterCountByUser(db, oneWeekAgo, now, 5);
    console.log(`   Top ${charStats.length} users by character count`);
    charStats.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.authorUsername}: ${user.totalCharacters} chars (avg: ${Math.round(user.avgCharactersPerMessage)})`);
    });
    
    // Test Reactions
    console.log('\n9. Testing Reactions Statistics...');
    const reactions = await analytics.getReactionsStats(db, oneWeekAgo, now);
    console.log(`   Total Messages: ${reactions.totalMessages}`);
    console.log(`   Messages with Reactions: ${reactions.messagesWithReactions}`);
    console.log(`   Total Reactions: ${reactions.totalReactions}`);
    if (reactions.topEmojis && reactions.topEmojis.length > 0) {
      console.log(`   Top Emoji: ${reactions.topEmojis[0].emoji} (${reactions.topEmojis[0].count} uses)`);
    }
    
    // Test Replies
    console.log('\n10. Testing Replies Statistics...');
    const replies = await analytics.getRepliesStats(db, oneWeekAgo, now);
    console.log(`   Total Messages: ${replies.totalMessages}`);
    console.log(`   Replies: ${replies.repliesCount}`);
    console.log(`   Reply Rate: ${replies.replyRate}%`);
    
    // Test Points Calculation
    console.log('\n11. Testing Points Calculation...');
    const pointsConfig = { default: 1, channels: {}, categories: {} };
    const userPoints = await analytics.calculateUserPoints(db, oneWeekAgo, now, pointsConfig, []);
    console.log(`   Found ${userPoints.length} users with points`);
    userPoints.slice(0, 3).forEach((user, i) => {
      console.log(`   ${i+1}. ${user.authorUsername}: ${Math.round(user.totalPoints)} points (${user.totalCharacters} chars)`);
    });
    
    // Test Activity Over Time
    console.log('\n12. Testing Activity Over Time...');
    const activityTimeline = await analytics.getActivityOverTime(db, oneWeekAgo, now, 'day');
    console.log(`   Generated ${activityTimeline.length} data points`);
    
    console.log('\n✅ All tests completed successfully!');
    
    db.close();
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    db.close();
    process.exit(1);
  }
}

runTests();
