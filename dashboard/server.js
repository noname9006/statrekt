// dashboard/server.js - Express server for the analytics dashboard
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const analytics = require('./analytics');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

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
 * Helper function to get date range based on timeframe
 */
function getDateRange(timeframe) {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'prev_24h':
      startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      return { startDate, endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    case 'prev_week':
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    case 'prev_month':
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to week
  }
  
  return { startDate, endDate: now };
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

// Routes

/**
 * Home page - Dashboard overview
 */
app.get('/', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'week';
    const compareWith = req.query.compare;
    
    const { startDate, endDate } = getDateRange(timeframe);
    
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
      repliesStats
    ] = await Promise.all([
      analytics.getOverallStats(db, startDate, endDate),
      analytics.getDAU(db, startDate, endDate),
      analytics.getWAU(db, startDate, endDate),
      analytics.getMAU(db, startDate, endDate),
      analytics.getMessagingActivityByChannel(db, startDate, endDate),
      analytics.getMessagingActivityByCategory(db, startDate, endDate),
      analytics.getTopUsers(db, startDate, endDate, 25),
      analytics.getReactionsStats(db, startDate, endDate),
      analytics.getRepliesStats(db, startDate, endDate)
    ]);
    
    let comparisonData = null;
    if (compareWith) {
      const comparisonRange = getDateRange(compareWith);
      comparisonData = await analytics.getOverallStats(db, comparisonRange.startDate, comparisonRange.endDate);
    }
    
    res.render('dashboard', {
      guildInfo,
      timeframe,
      compareWith,
      overallStats,
      dau,
      wau,
      mau,
      channelActivity,
      categoryActivity,
      topUsers,
      reactionsStats,
      repliesStats,
      comparisonData,
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
    const timeframe = req.query.timeframe || 'week';
    const { startDate, endDate } = getDateRange(timeframe);
    
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
      timeframe,
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
    
    // Get excluded roles from config
    const excludedRoles = pointsConfig.excludedRoles || [];
    
    const userPoints = await analytics.calculateUserPoints(
      db, 
      startDate, 
      endDate, 
      pointsConfig,
      excludedRoles
    );
    
    const roles = await getAllRoles();
    
    res.render('points', {
      guildInfo,
      timeframe,
      userPoints,
      pointsConfig,
      roles,
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
