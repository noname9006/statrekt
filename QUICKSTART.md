# Quick Start Guide

## Getting Started with StatRekt Dashboard

### Step 1: Prerequisites

Make sure you have:
- Node.js v16+ installed
- A Discord bot running with database (or use the test database)

### Step 2: Installation

```bash
npm install
```

### Step 3: Create Test Database (Optional)

If you want to test the dashboard without running the Discord bot first:

```bash
node create-test-db.js
```

This will create a test database with sample data.

### Step 4: Start the Dashboard

**Using npm:**
```bash
npm run dashboard
```

**Using the startup script:**
```bash
./start-dashboard.sh
```

**Manual start:**
```bash
node dashboard/server.js
```

### Step 5: Access the Dashboard

Open your web browser and navigate to:
```
http://localhost:3000
```

## Dashboard Pages

### 📊 Overview
The main dashboard showing:
- DAU, WAU, MAU metrics
- Total messages and activity
- Top users and channels
- Reactions and reply statistics
- Timeframe comparison

### 💬 Messages
Detailed message analytics:
- Activity over time charts
- Channel-by-channel breakdown
- Category statistics
- Top users by character count

### ⭐ Points
Points leaderboard system:
- Configurable points per character
- Role exclusions
- Custom multipliers (coming soon)
- Top 100 users ranked

### ⚙️ Settings
Configuration and management:
- Create role-based groups
- Exclude roles from statistics
- View server information
- Manage role hierarchy

## Timeframe Options

Select different timeframes to analyze:
- **Last 24 Hours** - Recent activity
- **Last 7 Days** - Weekly trends
- **Last 30 Days** - Monthly overview

## Comparison Mode

Compare metrics between timeframes:
- Previous 24h vs Current 24h
- Previous Week vs Current Week
- Previous Month vs Current Month

## Tips

1. **First Time Setup**: Run the bot first to collect data, or use the test database
2. **Best Performance**: Use a database with at least a few hundred messages
3. **Regular Updates**: The dashboard reads from the database in real-time
4. **Multiple Servers**: Each server has its own database file
5. **Data Privacy**: All data is stored locally on your machine

## Customization

### Change Port
```bash
DASHBOARD_PORT=8080 npm run dashboard
```

### Points Configuration
1. Go to Points page
2. Set default multiplier
3. Add excluded roles
4. Save configuration

### Role Groups
1. Go to Settings page
2. Create new group
3. Select base role
4. Save settings

## Troubleshooting

### "No database files found"
- Run the Discord bot first, or
- Create a test database with `node create-test-db.js`

### "Cannot find module"
- Run `npm install` to install dependencies

### Port already in use
- Change the port: `DASHBOARD_PORT=8080 npm run dashboard`
- Or stop the process using that port

### No data showing
- Verify database file exists and has data
- Check browser console for errors
- Refresh the page

## Features Roadmap

- [ ] Export data to CSV/Excel
- [ ] Custom date range selection
- [ ] More detailed activity heatmaps
- [ ] Voice channel statistics
- [ ] User profile pages
- [ ] Advanced filtering options
- [ ] Custom dashboard widgets
- [ ] Dark/Light theme toggle
- [ ] Mobile app view
- [ ] Real-time updates via WebSocket

## Support

For issues or questions:
1. Check the main README.md
2. Review this quick start guide
3. Check existing GitHub issues
4. Create a new issue if needed

Enjoy your StatRekt Dashboard! 🚀
