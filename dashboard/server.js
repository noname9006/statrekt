// dashboard/server.js - Express server for the analytics dashboard
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const analytics = require('./analytics');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Rate limiting for API endpoints (optional, for production deployments)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production' // Skip in development
});

// Apply rate limiting to API routes only
app.use('/api/', apiLimiter);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global database connection
let db = null;
let guildInfo = null;

// Default lookback period when no data is available (30 days in milliseconds)
const DEFAULT_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Find the most recent database file in the project root
 */
function findDatabaseFile() {
  const projectRoot = path.join(__dirname, '..');
  const files = fs.readdirSync(projectRoot)
    .filter(file => file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(projectRoot, file),
      mtime: fs.statSync(path.join(projectRoot, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
  
  if (files.length === 0) {
    console.warn('No database files found in project root');
    return null;
  }
  
  console.log(`Found ${files.length} database file(s), using most recent: ${files[0].name}`);
  return files[0].path;
}

/**
 * Initialize database connection
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = findDatabaseFile();
    
    if (!dbPath) {
      reject(new Error('No database file found. Please run the Discord bot first to create a database.'));
      return;
    }
    
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        reject(err);
        return;
      }
      
      console.log(`Connected to database: ${dbPath}`);
      
      // Load guild metadata
      db.all('SELECT key, value FROM guild_metadata', [], (err, rows) => {
        if (err) {
          console.error('Error loading guild metadata:', err);
          guildInfo = { guild_name: 'Unknown Server', guild_id: 'unknown' };
        } else {
          guildInfo = {};
          rows.forEach(row => {
            guildInfo[row.key] = row.value;
          });
        }
        
        console.log('Guild info loaded:', guildInfo);
        resolve();
      });
    });
  });
}

/**
 * Get the earliest message timestamp from the database
 */
function getEarliestTimestamp() {
  return new Promise((resolve, reject) => {
    const now = new Date();
    db.get('SELECT MIN(timestamp) as earliest FROM messages WHERE authorBot = 0', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      // If no messages found, default to 30 days ago
      const earliestTimestamp = row && row.earliest ? row.earliest : now.getTime() - DEFAULT_LOOKBACK_MS;
      resolve(new Date(earliestTimestamp));
    });
  });
}

/**
 * Helper function to get date range based on timeframe
 */
function getDateRange(timeframe) {
  const now = new Date();
  const moment = require('moment');
  let startDate, endDate;
  
  switch (timeframe) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'yesterday':
      // Yesterday from 00:00 to 23:59
      startDate = moment().subtract(1, 'days').startOf('day').toDate();
      endDate = moment().subtract(1, 'days').endOf('day').toDate();
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'lastweek':
      // Last week (Monday to Sunday)
      startDate = moment().subtract(1, 'weeks').startOf('isoWeek').toDate();
      endDate = moment().subtract(1, 'weeks').endOf('isoWeek').toDate();
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'lastmonth':
      // Last month (1st to last day)
      startDate = moment().subtract(1, 'months').startOf('month').toDate();
      endDate = moment().subtract(1, 'months').endOf('month').toDate();
      break;
    case 'prev_24h':
      startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'prev_week':
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'prev_month':
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to week
      endDate = now;
  }
  
  return { startDate, endDate };
}

/**
 * Get comparison periods (2 previous periods) for a timeframe
 */
function getComparisonPeriods(timeframe, startDate, endDate) {
  const moment = require('moment');
  const duration = endDate - startDate;
  
  // Period 1: immediately before the current period
  const period1End = new Date(startDate.getTime() - 1);
  const period1Start = new Date(period1End.getTime() - duration);
  
  // Period 2: before period 1
  const period2End = new Date(period1Start.getTime() - 1);
  const period2Start = new Date(period2End.getTime() - duration);
  
  return {
    period1: { startDate: period1Start, endDate: period1End },
    period2: { startDate: period2Start, endDate: period2End }
  };
}

/**
 * Get timeframe display info
 */
function getTimeframeInfo(timeframe, startDate, endDate) {
  const moment = require('moment');
  
  switch (timeframe) {
    case 'yesterday':
      return {
        label: `Yesterday (${moment(startDate).format('MMM D, YYYY')})`,
        showDAU: true,
        showWAU: false,
        showMAU: false,
        dauLabel: 'Daily Active Users'
      };
    case 'lastweek':
      const weekNum = moment(startDate).isoWeek();
      const weekDates = `${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D, YYYY')}`;
      return {
        label: `Last Week (Week ${weekNum}: ${weekDates})`,
        showDAU: true,
        showWAU: false,
        showMAU: false,
        dauLabel: 'Daily Active Users (week average)',
        isWeekAverage: true
      };
    case 'lastmonth':
      const monthName = moment(startDate).format('MMMM YYYY');
      return {
        label: `Last Month (${monthName})`,
        showDAU: true,
        showWAU: true,
        showMAU: false,
        dauLabel: 'Daily Active Users (month average)',
        wauLabel: 'Weekly Active Users (month average)',
        isMonthAverage: true
      };
    default:
      return {
        label: null,
        showDAU: true,
        showWAU: true,
        showMAU: true,
        dauLabel: 'Daily Active Users',
        wauLabel: 'Weekly Active Users',
        mauLabel: 'Monthly Active Users'
      };
  }
}

/**
 * Get all available roles from the database
 */
function getAllRoles() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, color, position, hoist
      FROM guild_roles
      WHERE deleted = 0
      ORDER BY position DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Get channels and categories structured for display
 */
function getChannelsAndCategories() {
  return new Promise((resolve, reject) => {
    // First check if position column exists
    db.all("PRAGMA table_info(channels)", [], (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasPosition = columns.some(col => col.name === 'position');
      const orderBy = hasPosition ? 'position ASC' : 'id ASC';
      
      const query = `
        SELECT 
          id, 
          name, 
          type, 
          parentCatId
          ${hasPosition ? ', position' : ''}
        FROM channels
        WHERE deleted = 0
        ORDER BY ${orderBy}
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Organize channels by category
        const categories = {};
        const uncategorized = [];
        
        rows.forEach(channel => {
          if (channel.type === 4) {
            // This is a category
            categories[channel.id] = {
              id: channel.id,
              name: channel.name,
              position: channel.position || 0,
              channels: []
            };
          }
        });
        
        // Add channels to their categories
        rows.forEach(channel => {
          if (channel.type !== 4) {
            // This is a channel (not a category)
            if (channel.parentCatId && categories[channel.parentCatId]) {
              categories[channel.parentCatId].channels.push({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position || 0
              });
            } else {
              uncategorized.push({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position || 0
              });
            }
          }
        });
        
        // Convert to array and sort
        const categoryList = Object.values(categories).sort((a, b) => a.position - b.position);
        
        resolve({
          categories: categoryList,
          uncategorized: uncategorized
        });
      });
    });
  });
}

// Routes

/**
 * Home page - Dashboard overview
 */
app.get('/', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'week';
    const compareWith = req.query.compare;
    
    const { startDate, endDate } = getDateRange(timeframe);
    const timeframeInfo = getTimeframeInfo(timeframe, startDate, endDate);
    
    // Get comparison periods (2 previous periods)
    const comparisonPeriods = getComparisonPeriods(timeframe, startDate, endDate);
    
    // Get all statistics
    const [
      overallStats,
      dau,
      wau,
      mau,
      channelActivity,
      categoryActivity,
      topUsers,
      reactionsStats,
      repliesStats,
      // Comparison data
      period1Stats,
      period2Stats
    ] = await Promise.all([
      analytics.getOverallStats(db, startDate, endDate),
      analytics.getDAU(db, startDate, endDate),
      analytics.getWAU(db, startDate, endDate),
      analytics.getMAU(db, startDate, endDate),
      analytics.getMessagingActivityByChannel(db, startDate, endDate),
      analytics.getMessagingActivityByCategory(db, startDate, endDate),
      analytics.getTopUsers(db, startDate, endDate, 25),
      analytics.getReactionsStats(db, startDate, endDate),
      analytics.getRepliesStats(db, startDate, endDate),
      // Get comparison periods data
      analytics.getOverallStats(db, comparisonPeriods.period1.startDate, comparisonPeriods.period1.endDate),
      analytics.getOverallStats(db, comparisonPeriods.period2.startDate, comparisonPeriods.period2.endDate)
    ]);
    
    // Calculate averages for week/month views
    let dauValue = dau.count;
    let wauValue = wau.count;
    
    if (timeframeInfo.isWeekAverage || timeframeInfo.isMonthAverage) {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      dauValue = Math.round(dau.count / days);
      
      if (timeframeInfo.isMonthAverage) {
        const weeks = Math.ceil(days / 7);
        wauValue = Math.round(wau.count / weeks);
      }
    }
    
    let comparisonData = null;
    if (compareWith) {
      const comparisonRange = getDateRange(compareWith);
      comparisonData = await analytics.getOverallStats(db, comparisonRange.startDate, comparisonRange.endDate);
    }
    
    res.render('dashboard', {
      guildInfo,
      timeframe,
      timeframeInfo,
      compareWith,
      overallStats,
      dau: { ...dau, displayValue: dauValue },
      wau: { ...wau, displayValue: wauValue },
      mau,
      channelActivity,
      categoryActivity,
      topUsers,
      reactionsStats,
      repliesStats,
      comparisonData,
      period1Stats,
      period2Stats,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard: ' + error.message);
  }
});

/**
 * Messages page - Detailed message analytics
 */
app.get('/messages', async (req, res) => {
  try {
    // Get the full range of data available from the database
    const now = new Date();
    const defaultStartDate = await getEarliestTimestamp();
    
    // Check for custom date range from query params
    const startDate = req.query.startDate ? new Date(req.query.startDate) : defaultStartDate;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : now;
    
    const [
      channelActivity,
      categoryActivity,
      topUsers,
      activityOverTime
    ] = await Promise.all([
      analytics.getMessagingActivityByChannel(db, startDate, endDate),
      analytics.getMessagingActivityByCategory(db, startDate, endDate),
      analytics.getCharacterCountByUser(db, startDate, endDate, 50),
      analytics.getActivityOverTime(db, startDate, endDate, 'day')
    ]);
    
    res.render('messages', {
      guildInfo,
      channelActivity,
      categoryActivity,
      topUsers,
      activityOverTime,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error loading messages page:', error);
    res.status(500).send('Error loading messages page: ' + error.message);
  }
});

/**
 * Active Users page - DAU timeline with draggable slider
 */
app.get('/active-users', async (req, res) => {
  try {
    // Get the full range of data available from the database
    const now = new Date();
    const defaultStartDate = await getEarliestTimestamp();
    
    // Check for custom date range from query params
    const startDate = req.query.startDate ? new Date(req.query.startDate) : defaultStartDate;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : now;
    
    // Get all metrics data
    const [dauTimeline, wauTimeline, twoWauTimeline, mauTimeline] = await Promise.all([
      analytics.getDAUOverTime(db, startDate, endDate),
      analytics.getWAUOverTime(db, startDate, endDate),
      analytics.get2WAUOverTime(db, startDate, endDate),
      analytics.getMAUOverTime(db, startDate, endDate)
    ]);
    
    res.render('active-users', {
      guildInfo,
      dauTimeline,
      wauTimeline,
      twoWauTimeline,
      mauTimeline,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error loading active users page:', error);
    res.status(500).send('Error loading active users page: ' + error.message);
  }
});

/**
 * Points dashboard page
 */
app.get('/points', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'week';
    const { startDate, endDate } = getDateRange(timeframe);
    
    // Load points configuration from file or use defaults
    let pointsConfig = { default: 1, channels: {}, categories: {} };
    const configPath = path.join(__dirname, 'points-config.json');
    
    if (fs.existsSync(configPath)) {
      try {
        pointsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) {
        console.error('Error loading points config:', e);
      }
    }
    
    // Get excluded roles from config (no longer displayed but kept for backward compatibility)
    const excludedRoles = pointsConfig.excludedRoles || [];
    
    const [userPoints, roles, channelsData] = await Promise.all([
      analytics.calculateUserPoints(db, startDate, endDate, pointsConfig, excludedRoles),
      getAllRoles(),
      getChannelsAndCategories()
    ]);
    
    res.render('points', {
      guildInfo,
      timeframe,
      userPoints,
      pointsConfig,
      roles,
      channels: channelsData.categories,
      uncategorizedChannels: channelsData.uncategorized,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Error loading points page:', error);
    res.status(500).send('Error loading points page: ' + error.message);
  }
});

/**
 * Settings page - Configure groups and exclusions
 */
app.get('/settings', async (req, res) => {
  try {
    const roles = await getAllRoles();
    
    // Load settings from file or use defaults
    let settings = { 
      excludedRoles: [],
      roleGroups: []
    };
    const settingsPath = path.join(__dirname, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
    
    res.render('settings', {
      guildInfo,
      roles,
      settings
    });
  } catch (error) {
    console.error('Error loading settings page:', error);
    res.status(500).send('Error loading settings page: ' + error.message);
  }
});

/**
 * API endpoint to save points configuration
 */
app.post('/api/points-config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'points-config.json');
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Points configuration saved' });
  } catch (error) {
    console.error('Error saving points config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to save settings
 */
app.post('/api/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to get analytics data (for AJAX requests)
 */
app.get('/api/analytics/:metric', async (req, res) => {
  try {
    const metric = req.params.metric;
    const timeframe = req.query.timeframe || 'week';
    const { startDate, endDate } = getDateRange(timeframe);
    
    let data;
    
    switch (metric) {
      case 'dau':
        data = await analytics.getDAU(db, startDate, endDate);
        break;
      case 'wau':
        data = await analytics.getWAU(db, startDate, endDate);
        break;
      case 'mau':
        data = await analytics.getMAU(db, startDate, endDate);
        break;
      case 'channels':
        data = await analytics.getMessagingActivityByChannel(db, startDate, endDate);
        break;
      case 'categories':
        data = await analytics.getMessagingActivityByCategory(db, startDate, endDate);
        break;
      case 'top-users':
        data = await analytics.getTopUsers(db, startDate, endDate, 50);
        break;
      case 'activity-timeline':
        const granularity = req.query.granularity || 'day';
        data = await analytics.getActivityOverTime(db, startDate, endDate, granularity);
        break;
      case 'dau-timeline':
        // Use custom date range if provided
        const customStart = req.query.startDate ? new Date(req.query.startDate) : startDate;
        const customEnd = req.query.endDate ? new Date(req.query.endDate) : endDate;
        data = await analytics.getDAUOverTime(db, customStart, customEnd);
        break;
      default:
        return res.status(400).json({ error: 'Unknown metric' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n================================================`);
      console.log(`Dashboard is running at http://localhost:${PORT}`);
      console.log(`Guild: ${guildInfo.guild_name || 'Unknown'}`);
      console.log(`================================================\n`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize dashboard:', err);
    console.error('Make sure you have run the Discord bot first to create a database.');
    process.exit(1);
  });

module.exports = app;
