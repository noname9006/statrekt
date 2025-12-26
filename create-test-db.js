// create-test-db.js - Create a test database for dashboard testing
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test-server_123456789_2024-01-01_00-00-00.db');

// Delete old test database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

console.log('Creating test database...');

db.serialize(() => {
  // Create tables
  db.run(`
    CREATE TABLE guild_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      content TEXT,
      authorId TEXT,
      authorUsername TEXT,
      authorBot INTEGER,
      timestamp INTEGER,
      createdAt TEXT,
      channelId TEXT,
      attachmentsJson TEXT,
      embedsJson TEXT,
      reactionsJson TEXT,
      sticker_items TEXT,
      edited_timestamp TEXT,
      tts INTEGER,
      mention_everyone INTEGER,
      mentions TEXT,
      mention_roles TEXT,
      mention_channels TEXT,
      type INTEGER,
      message_reference TEXT,
      flags INTEGER
    )
  `);

  db.run(`
    CREATE TABLE channels (
      id TEXT PRIMARY KEY,
      type INTEGER,
      name TEXT,
      parentChannelId TEXT,
      parentCatId TEXT,
      createdAt INTEGER,
      lastMessageId TEXT,
      deleted INTEGER DEFAULT 0,
      deletedAt INTEGER,
      fetchStarted INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE guild_members (
      id TEXT PRIMARY KEY,
      username TEXT,
      avatarURL TEXT,
      joinedAt TEXT,
      joinedTimestamp INTEGER,
      bot INTEGER DEFAULT 0,
      lastUpdated INTEGER,
      leftGuild INTEGER DEFAULT 0,
      leftTimestamp INTEGER,
      rejoinTimestamp INTEGER
    )
  `);

  db.run(`
    CREATE TABLE member_roles (
      memberId TEXT,
      roleId TEXT,
      roleName TEXT,
      addedAt INTEGER,
      PRIMARY KEY (memberId, roleId)
    )
  `);

  db.run(`
    CREATE TABLE guild_roles (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      position INTEGER,
      permissions TEXT,
      mentionable INTEGER,
      hoist INTEGER,
      managed INTEGER,
      createdAt TEXT,
      createdTimestamp INTEGER,
      updatedAt TEXT,
      updatedTimestamp INTEGER,
      deleted INTEGER DEFAULT 0,
      deletedAt TEXT,
      deletedTimestamp INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
      return;
    }

    console.log('Tables created successfully');

    // Insert test metadata
    const metadata = [
      ['guild_id', '123456789'],
      ['guild_name', 'Test Server'],
      ['creation_date', new Date().toISOString()]
    ];

    metadata.forEach(([key, value]) => {
      db.run('INSERT INTO guild_metadata (key, value) VALUES (?, ?)', [key, value]);
    });

    // Insert test channels
    const channels = [
      ['channel1', 0, 'general', null, 'cat1', Date.now(), 0, 0, null, 0],
      ['channel2', 0, 'random', null, 'cat1', Date.now(), 0, 0, null, 0],
      ['channel3', 0, 'announcements', null, 'cat2', Date.now(), 0, 0, null, 0],
      ['cat1', 4, 'General Category', null, null, Date.now(), 0, 0, null, 0],
      ['cat2', 4, 'Announcements', null, null, Date.now(), 0, 0, null, 0]
    ];

    channels.forEach(channel => {
      db.run(
        'INSERT INTO channels VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        channel
      );
    });

    // Insert test roles
    const roles = [
      ['role1', 'Admin', '#FF0000', 10, '8', 1, 1, 0, new Date().toISOString(), Date.now(), null, null, 0, null, null],
      ['role2', 'Moderator', '#00FF00', 9, '8', 1, 1, 0, new Date().toISOString(), Date.now(), null, null, 0, null, null],
      ['role3', 'Member', '#0000FF', 5, '0', 0, 0, 0, new Date().toISOString(), Date.now(), null, null, 0, null, null],
      ['role4', 'Bot', '#999999', 1, '0', 0, 0, 1, new Date().toISOString(), Date.now(), null, null, 0, null, null]
    ];

    roles.forEach(role => {
      db.run(
        'INSERT INTO guild_roles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        role
      );
    });

    // Insert test members
    const members = [
      ['user1', 'Alice', 'https://cdn.discordapp.com/avatars/1.png', new Date().toISOString(), Date.now(), 0, Date.now(), 0, null, null],
      ['user2', 'Bob', 'https://cdn.discordapp.com/avatars/2.png', new Date().toISOString(), Date.now(), 0, Date.now(), 0, null, null],
      ['user3', 'Charlie', 'https://cdn.discordapp.com/avatars/3.png', new Date().toISOString(), Date.now(), 0, Date.now(), 0, null, null],
      ['user4', 'TestBot', 'https://cdn.discordapp.com/avatars/4.png', new Date().toISOString(), Date.now(), 1, Date.now(), 0, null, null]
    ];

    members.forEach(member => {
      db.run(
        'INSERT INTO guild_members VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        member
      );
    });

    // Insert member roles
    const memberRoles = [
      ['user1', 'role1', 'Admin', Date.now()],
      ['user2', 'role2', 'Moderator', Date.now()],
      ['user3', 'role3', 'Member', Date.now()],
      ['user4', 'role4', 'Bot', Date.now()]
    ];

    memberRoles.forEach(mr => {
      db.run(
        'INSERT INTO member_roles VALUES (?, ?, ?, ?)',
        mr
      );
    });

    // Insert test messages
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const messages = [];
    
    // Generate 100 messages across different timeframes
    for (let i = 0; i < 100; i++) {
      let timestamp;
      if (i < 30) {
        // Last 24 hours
        timestamp = oneDayAgo + Math.random() * (now - oneDayAgo);
      } else if (i < 70) {
        // Last week
        timestamp = oneWeekAgo + Math.random() * (oneDayAgo - oneWeekAgo);
      } else {
        // Last month
        timestamp = oneMonthAgo + Math.random() * (oneWeekAgo - oneMonthAgo);
      }

      const userId = `user${(i % 3) + 1}`;
      const username = ['Alice', 'Bob', 'Charlie'][i % 3];
      const channelId = `channel${(i % 3) + 1}`;
      const content = `Test message ${i} with some content to count characters`;
      const hasReaction = i % 5 === 0;
      const isReply = i % 7 === 0;

      messages.push([
        `msg${i}`,
        content,
        userId,
        username,
        0,
        Math.floor(timestamp),
        new Date(timestamp).toISOString(),
        channelId,
        '[]',
        '[]',
        hasReaction ? '[{"emoji":"👍","count":3}]' : '[]',
        null,
        null,
        0,
        0,
        '[]',
        '[]',
        '[]',
        0,
        isReply ? '{"messageId":"msg0","channelId":"channel1","guildId":"123456789"}' : null,
        0
      ]);
    }

    let insertedCount = 0;
    messages.forEach(msg => {
      db.run(
        `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        msg,
        (err) => {
          if (err) {
            console.error('Error inserting message:', err);
          } else {
            insertedCount++;
            if (insertedCount === messages.length) {
              console.log(`Successfully created test database with ${messages.length} messages`);
              console.log(`Database location: ${dbPath}`);
              db.close();
            }
          }
        }
      );
    });
  });
});
