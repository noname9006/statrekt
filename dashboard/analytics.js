// analytics.js - Core analytics calculations for the dashboard
const moment = require('moment');

/**
 * Get Daily Active Users (DAU) for a given timeframe
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Object with count and user list
 */
function getDAU(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT COUNT(DISTINCT authorId) as count
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ count: row ? row.count : 0 });
    });
  });
}

/**
 * Get Weekly Active Users (WAU) for a given timeframe
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Object with count and user list
 */
function getWAU(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT COUNT(DISTINCT authorId) as count
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ count: row ? row.count : 0 });
    });
  });
}

/**
 * Get Monthly Active Users (MAU) for a given timeframe
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Object with count and user list
 */
function getMAU(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT COUNT(DISTINCT authorId) as count
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ count: row ? row.count : 0 });
    });
  });
}

/**
 * Get messaging activity by channel
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of channel statistics
 */
function getMessagingActivityByChannel(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        m.channelId,
        c.name as channelName,
        c.type as channelType,
        c.parentCatId,
        COUNT(m.id) as messageCount,
        COUNT(DISTINCT m.authorId) as uniqueUsers,
        COALESCE(SUM(LENGTH(m.content)), 0) as totalCharacters
      FROM messages m
      LEFT JOIN channels c ON m.channelId = c.id
      WHERE m.timestamp BETWEEN ? AND ?
        AND m.authorBot = 0
      GROUP BY m.channelId
      ORDER BY messageCount DESC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get messaging activity by category
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of category statistics
 */
function getMessagingActivityByCategory(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        COALESCE(c.parentCatId, 'uncategorized') as categoryId,
        COALESCE(parent.name, 'Uncategorized') as categoryName,
        COUNT(m.id) as messageCount,
        COUNT(DISTINCT m.authorId) as uniqueUsers,
        COALESCE(SUM(LENGTH(m.content)), 0) as totalCharacters
      FROM messages m
      LEFT JOIN channels c ON m.channelId = c.id
      LEFT JOIN channels parent ON c.parentCatId = parent.id
      WHERE m.timestamp BETWEEN ? AND ?
        AND m.authorBot = 0
      GROUP BY COALESCE(c.parentCatId, 'uncategorized'), COALESCE(parent.name, 'Uncategorized')
      ORDER BY messageCount DESC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get character count statistics per user
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @param {Number} limit - Maximum number of users to return
 * @returns {Promise<Array>} - Array of user character statistics
 */
function getCharacterCountByUser(db, startDate, endDate, limit = 50) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        m.authorId,
        m.authorUsername,
        COUNT(m.id) as messageCount,
        COALESCE(SUM(LENGTH(m.content)), 0) as totalCharacters,
        COALESCE(AVG(LENGTH(m.content)), 0) as avgCharactersPerMessage
      FROM messages m
      WHERE m.timestamp BETWEEN ? AND ?
        AND m.authorBot = 0
      GROUP BY m.authorId
      ORDER BY totalCharacters DESC
      LIMIT ?
    `;
    
    db.all(query, [startTimestamp, endTimestamp, limit], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get reactions statistics
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Reactions statistics
 */
function getReactionsStats(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        COUNT(CASE WHEN reactionsJson != '[]' THEN 1 END) as messagesWithReactions,
        COUNT(id) as totalMessages
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Parse reactions from JSON to count total reactions
      const reactionQuery = `
        SELECT reactionsJson
        FROM messages
        WHERE timestamp BETWEEN ? AND ?
          AND authorBot = 0
          AND reactionsJson != '[]'
      `;
      
      db.all(reactionQuery, [startTimestamp, endTimestamp], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        let totalReactions = 0;
        const emojiCounts = {};
        
        rows.forEach(r => {
          try {
            const reactions = JSON.parse(r.reactionsJson);
            reactions.forEach(reaction => {
              totalReactions += reaction.count || 0;
              const emoji = reaction.emoji || 'unknown';
              emojiCounts[emoji] = (emojiCounts[emoji] || 0) + (reaction.count || 0);
            });
          } catch (e) {
            // Skip invalid JSON
          }
        });
        
        // Sort emojis by count
        const topEmojis = Object.entries(emojiCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([emoji, count]) => ({ emoji, count }));
        
        resolve({
          totalMessages: row ? row.totalMessages : 0,
          messagesWithReactions: row ? row.messagesWithReactions : 0,
          totalReactions,
          topEmojis
        });
      });
    });
  });
}

/**
 * Get replies/threads statistics
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Replies statistics
 */
function getRepliesStats(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        COUNT(CASE WHEN message_reference IS NOT NULL THEN 1 END) as repliesCount,
        COUNT(id) as totalMessages
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        totalMessages: row ? row.totalMessages : 0,
        repliesCount: row ? row.repliesCount : 0,
        replyRate: row && row.totalMessages > 0 
          ? (row.repliesCount / row.totalMessages * 100).toFixed(2) 
          : 0
      });
    });
  });
}

/**
 * Get overall messaging statistics
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Object>} - Overall statistics
 */
function getOverallStats(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const query = `
      SELECT 
        COUNT(id) as totalMessages,
        COUNT(DISTINCT authorId) as uniqueUsers,
        COUNT(DISTINCT channelId) as activeChannels,
        COALESCE(SUM(LENGTH(content)), 0) as totalCharacters,
        COALESCE(AVG(LENGTH(content)), 0) as avgMessageLength
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
    `;
    
    db.get(query, [startTimestamp, endTimestamp], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      const result = row || {};
      resolve({
        totalMessages: result.totalMessages || 0,
        uniqueUsers: result.uniqueUsers || 0,
        activeChannels: result.activeChannels || 0,
        totalCharacters: result.totalCharacters || 0,
        avgMessageLength: result.avgMessageLength || 0
      });
    });
  });
}

/**
 * Get top users by message count
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @param {Number} limit - Maximum number of users to return
 * @param {Array} excludedRoles - Array of role IDs to exclude
 * @returns {Promise<Array>} - Array of top users
 */
function getTopUsers(db, startDate, endDate, limit = 50, excludedRoles = []) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    let query = `
      SELECT 
        m.authorId,
        m.authorUsername,
        COUNT(m.id) as messageCount,
        COALESCE(SUM(LENGTH(m.content)), 0) as totalCharacters
      FROM messages m
      WHERE m.timestamp BETWEEN ? AND ?
        AND m.authorBot = 0
    `;
    
    const params = [startTimestamp, endTimestamp];
    
    // Add role exclusion if provided
    if (excludedRoles && excludedRoles.length > 0) {
      query += `
        AND m.authorId NOT IN (
          SELECT DISTINCT memberId 
          FROM member_roles 
          WHERE roleId IN (${excludedRoles.map(() => '?').join(',')})
        )
      `;
      params.push(...excludedRoles);
    }
    
    query += `
      GROUP BY m.authorId
      ORDER BY messageCount DESC
      LIMIT ?
    `;
    
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get activity over time (for charts)
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @param {String} granularity - 'hour', 'day', 'week'
 * @returns {Promise<Array>} - Array of time-based activity data
 */
function getActivityOverTime(db, startDate, endDate, granularity = 'day') {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all messages to group them properly
    const query = `
      SELECT 
        timestamp,
        authorId,
        LENGTH(content) as charCount
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group by granularity
      const grouped = {};
      
      rows.forEach(row => {
        const date = moment(row.timestamp);
        let key;
        
        if (granularity === 'hour') {
          key = date.format('YYYY-MM-DD HH:00');
        } else if (granularity === 'day') {
          key = date.format('YYYY-MM-DD');
        } else if (granularity === 'week') {
          key = date.startOf('week').format('YYYY-MM-DD');
        }
        
        if (!grouped[key]) {
          grouped[key] = { messageCount: 0, uniqueUsers: new Set(), totalCharacters: 0 };
        }
        
        grouped[key].messageCount += 1;
        grouped[key].uniqueUsers.add(row.authorId);
        grouped[key].totalCharacters += (row.charCount || 0);
      });
      
      // Convert to array
      const result = Object.entries(grouped).map(([date, data]) => ({
        date,
        messageCount: data.messageCount,
        uniqueUsers: data.uniqueUsers.size,
        totalCharacters: data.totalCharacters
      }));
      
      resolve(result);
    });
  });
}

/**
 * Calculate points for users based on character count
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @param {Object} pointsConfig - Points configuration (channel/category multipliers)
 * @param {Array} excludedRoles - Array of role IDs to exclude
 * @returns {Promise<Array>} - Array of users with points
 */
function calculateUserPoints(db, startDate, endDate, pointsConfig = {}, excludedRoles = []) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Default: 1 character = 1 point
    const defaultMultiplier = pointsConfig.default || 1;
    
    const query = `
      SELECT 
        m.authorId,
        m.authorUsername,
        m.channelId,
        c.parentCatId,
        SUM(LENGTH(m.content)) as characters
      FROM messages m
      LEFT JOIN channels c ON m.channelId = c.id
      WHERE m.timestamp BETWEEN ? AND ?
        AND m.authorBot = 0
      GROUP BY m.authorId, m.channelId
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Calculate points with multipliers
      const userPoints = {};
      
      rows.forEach(row => {
        const userId = row.authorId;
        const channelId = row.channelId;
        const categoryId = row.parentCatId;
        const characters = row.characters || 0;
        
        // Determine multiplier
        let multiplier = defaultMultiplier;
        
        // Channel-specific multiplier takes precedence
        if (pointsConfig.channels && pointsConfig.channels[channelId]) {
          multiplier = pointsConfig.channels[channelId];
        }
        // Category multiplier
        else if (pointsConfig.categories && pointsConfig.categories[categoryId]) {
          multiplier = pointsConfig.categories[categoryId];
        }
        
        const points = characters * multiplier;
        
        if (!userPoints[userId]) {
          userPoints[userId] = {
            authorId: userId,
            authorUsername: row.authorUsername,
            totalPoints: 0,
            totalCharacters: 0
          };
        }
        
        userPoints[userId].totalPoints += points;
        userPoints[userId].totalCharacters += characters;
      });
      
      // Filter excluded roles
      if (excludedRoles && excludedRoles.length > 0) {
        const excludeQuery = `
          SELECT DISTINCT memberId 
          FROM member_roles 
          WHERE roleId IN (${excludedRoles.map(() => '?').join(',')})
        `;
        
        db.all(excludeQuery, excludedRoles, (err, excludedUsers) => {
          if (err) {
            reject(err);
            return;
          }
          
          const excludedIds = new Set(excludedUsers.map(u => u.memberId));
          
          // Filter and sort
          const result = Object.values(userPoints)
            .filter(user => !excludedIds.has(user.authorId))
            .sort((a, b) => b.totalPoints - a.totalPoints);
          
          resolve(result);
        });
      } else {
        // Sort by points
        const result = Object.values(userPoints)
          .sort((a, b) => b.totalPoints - a.totalPoints);
        
        resolve(result);
      }
    });
  });
}

/**
 * Get Daily Active Users over time (for timeline charts)
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of daily DAU data
 */
function getDAUOverTime(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all messages to group them by day
    const query = `
      SELECT 
        timestamp,
        authorId
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group by day
      const grouped = {};
      
      rows.forEach(row => {
        const date = moment(row.timestamp);
        const key = date.format('YYYY-MM-DD');
        
        if (!grouped[key]) {
          grouped[key] = new Set();
        }
        
        grouped[key].add(row.authorId);
      });
      
      // Convert to array and fill in missing days
      const result = [];
      const currentDate = moment(startDate);
      const endMoment = moment(endDate);
      
      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const key = currentDate.format('YYYY-MM-DD');
        result.push({
          date: key,
          dau: grouped[key] ? grouped[key].size : 0
        });
        currentDate.add(1, 'day');
      }
      
      resolve(result);
    });
  });
}

/**
 * Get Weekly Active Users over time (for timeline charts)
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of daily WAU data (rolling 7-day window)
 */
function getWAUOverTime(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all messages to group them by day
    const query = `
      SELECT 
        timestamp,
        authorId
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group by day
      const grouped = {};
      
      rows.forEach(row => {
        const date = moment(row.timestamp);
        const key = date.format('YYYY-MM-DD');
        
        if (!grouped[key]) {
          grouped[key] = new Set();
        }
        
        grouped[key].add(row.authorId);
      });
      
      // Calculate rolling 7-day WAU
      const result = [];
      const currentDate = moment(startDate);
      const endMoment = moment(endDate);
      
      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const uniqueUsers = new Set();
        
        // Look back 7 days from current date
        for (let i = 0; i < 7; i++) {
          const lookbackDate = moment(currentDate).subtract(i, 'days');
          const key = lookbackDate.format('YYYY-MM-DD');
          
          if (grouped[key]) {
            grouped[key].forEach(userId => uniqueUsers.add(userId));
          }
        }
        
        result.push({
          date: currentDate.format('YYYY-MM-DD'),
          wau: uniqueUsers.size
        });
        currentDate.add(1, 'day');
      }
      
      resolve(result);
    });
  });
}

/**
 * Get Bi-Weekly Active Users over time (for timeline charts)
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of daily 2WAU data (rolling 14-day window)
 */
function get2WAUOverTime(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all messages to group them by day
    const query = `
      SELECT 
        timestamp,
        authorId
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group by day
      const grouped = {};
      
      rows.forEach(row => {
        const date = moment(row.timestamp);
        const key = date.format('YYYY-MM-DD');
        
        if (!grouped[key]) {
          grouped[key] = new Set();
        }
        
        grouped[key].add(row.authorId);
      });
      
      // Calculate rolling 14-day 2WAU
      const result = [];
      const currentDate = moment(startDate);
      const endMoment = moment(endDate);
      
      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const uniqueUsers = new Set();
        
        // Look back 14 days from current date
        for (let i = 0; i < 14; i++) {
          const lookbackDate = moment(currentDate).subtract(i, 'days');
          const key = lookbackDate.format('YYYY-MM-DD');
          
          if (grouped[key]) {
            grouped[key].forEach(userId => uniqueUsers.add(userId));
          }
        }
        
        result.push({
          date: currentDate.format('YYYY-MM-DD'),
          '2wau': uniqueUsers.size
        });
        currentDate.add(1, 'day');
      }
      
      resolve(result);
    });
  });
}

/**
 * Get Monthly Active Users over time (for timeline charts)
 * @param {Object} db - SQLite database connection
 * @param {Date} startDate - Start of the timeframe
 * @param {Date} endDate - End of the timeframe
 * @returns {Promise<Array>} - Array of daily MAU data (rolling 30-day window)
 */
function getMAUOverTime(db, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all messages to group them by day
    const query = `
      SELECT 
        timestamp,
        authorId
      FROM messages
      WHERE timestamp BETWEEN ? AND ?
        AND authorBot = 0
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Group by day
      const grouped = {};
      
      rows.forEach(row => {
        const date = moment(row.timestamp);
        const key = date.format('YYYY-MM-DD');
        
        if (!grouped[key]) {
          grouped[key] = new Set();
        }
        
        grouped[key].add(row.authorId);
      });
      
      // Calculate rolling 30-day MAU
      const result = [];
      const currentDate = moment(startDate);
      const endMoment = moment(endDate);
      
      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const uniqueUsers = new Set();
        
        // Look back 30 days from current date
        for (let i = 0; i < 30; i++) {
          const lookbackDate = moment(currentDate).subtract(i, 'days');
          const key = lookbackDate.format('YYYY-MM-DD');
          
          if (grouped[key]) {
            grouped[key].forEach(userId => uniqueUsers.add(userId));
          }
        }
        
        result.push({
          date: currentDate.format('YYYY-MM-DD'),
          mau: uniqueUsers.size
        });
        currentDate.add(1, 'day');
      }
      
      resolve(result);
    });
  });
}

module.exports = {
  getDAU,
  getWAU,
  getMAU,
  getMessagingActivityByChannel,
  getMessagingActivityByCategory,
  getCharacterCountByUser,
  getReactionsStats,
  getRepliesStats,
  getOverallStats,
  getTopUsers,
  getActivityOverTime,
  calculateUserPoints,
  getDAUOverTime,
  getWAUOverTime,
  get2WAUOverTime,
  getMAUOverTime
};
