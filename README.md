# StatRekt Dashboard

A comprehensive web analytics dashboard for Discord servers - a better alternative to Statbot's dashboard.

## Features

### 📊 Overview Dashboard
- **Daily Active Users (DAU)** - Track unique users who sent messages in the last 24 hours
- **Weekly Active Users (WAU)** - Track unique users over the past week
- **Monthly Active Users (MAU)** - Track unique users over the past month
- **Total Messages** - See total message count with timeframe comparisons
- **Active Channels** - Number of channels with activity
- **Character Statistics** - Total and average characters per message
- **Reactions Analytics** - Track messages with reactions and most used emojis
- **Reply Rate** - Percentage of messages that are replies

### 💬 Message Analytics
- **Activity Over Time** - Visual charts showing message trends
- **Channel-by-Channel Breakdown** - Detailed statistics for each channel
- **Category Analytics** - Aggregate stats by channel categories
- **Top Users by Character Count** - Leaderboard of most verbose users
- **Character per Message Metrics** - Average verbosity stats

### ⭐ Points System
- **Character-Based Points** - Default: 1 character = 1 point
- **Customizable Multipliers** - Set different point values per channel or category
- **Role Exclusions** - Exclude users with specific roles from earning points
- **Leaderboard** - Ranked list of top users by points

### ⚙️ Settings & Configuration
- **Role-Based Groups** - Create groups based on users' highest roles
- **Excluded Roles** - Exclude specific roles from all statistics
- **Server Information** - View server metadata and role hierarchy

### 🕐 Timeframe Options
- **Last 24 Hours** - Recent activity snapshot
- **Last 7 Days** - Weekly trends
- **Last 30 Days** - Monthly overview
- **Comparison Mode** - Compare current period with previous period

## Installation

### Prerequisites
- Node.js (v16 or higher)
- An existing Discord bot with database (created by running the main bot)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure you have run the Discord bot first to create a database file (*.db file in the project root)

3. Start the dashboard:
```bash
npm run dashboard
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Configuration

The dashboard will automatically find and use the most recent database file in the project root.

You can customize the port by setting an environment variable:
```bash
DASHBOARD_PORT=8080 npm run dashboard
```

## Usage

### Navigation
Use the sidebar menu to switch between different views:
- 📊 **Overview** - Main dashboard with key metrics
- 💬 **Messages** - Detailed message analytics
- ⭐ **Points** - Points leaderboard and configuration
- ⚙️ **Settings** - Server settings and role management

### Timeframe Selection
Use the dropdown at the top right to select different timeframes:
- Last 24 Hours
- Last 7 Days
- Last 30 Days

### Comparison Mode
Select a comparison period to see how metrics have changed:
- Previous 24h
- Previous Week
- Previous Month

### Configuring Points
1. Navigate to the Points page
2. Set the default points per character (default: 1)
3. Add roles to exclude from points calculations
4. Click "Save Configuration"
5. Points will be recalculated on next page load

### Creating Role Groups
1. Navigate to Settings
2. Scroll to "Role-Based Groups"
3. Enter a group name
4. Select the base role for the group
5. Click "Create Group"

### Excluding Roles from Statistics
1. Navigate to Settings
2. Scroll to "Excluded Roles"
3. Select roles to exclude
4. Click "Save Settings"

## Database Schema

The dashboard reads from the following tables:

### messages
- Message content, author, timestamp, channel
- Reactions, attachments, embeds
- Mentions, replies, and other metadata

### channels
- Channel names, types, categories
- Parent channel relationships

### guild_members
- Member information, join dates
- Bot status, leave/rejoin tracking

### member_roles
- Current role assignments
- Role addition timestamps

### guild_roles
- Role hierarchy, colors, permissions
- Hoisted and mentionable status

### guild_metadata
- Server name, ID, creation date

## API Endpoints

The dashboard exposes several API endpoints for dynamic data loading:

### GET /api/analytics/:metric
Get specific analytics metrics:
- `/api/analytics/dau` - Daily Active Users
- `/api/analytics/wau` - Weekly Active Users
- `/api/analytics/mau` - Monthly Active Users
- `/api/analytics/channels` - Channel activity
- `/api/analytics/categories` - Category activity
- `/api/analytics/top-users` - Top users
- `/api/analytics/activity-timeline` - Activity over time

Query parameters:
- `timeframe` - 24h, week, or month
- `granularity` - hour, day, or week (for activity-timeline)

### POST /api/points-config
Save points configuration:
```json
{
  "default": 1,
  "excludedRoles": ["role_id_1", "role_id_2"],
  "channels": {},
  "categories": {}
}
```

### POST /api/settings
Save server settings:
```json
{
  "excludedRoles": ["role_id_1"],
  "roleGroups": [
    {
      "name": "Group Name",
      "roleId": "role_id"
    }
  ]
}
```

## Architecture

### Backend
- **Express.js** - Web server framework
- **SQLite3** - Database connection and queries
- **EJS** - Server-side templating
- **Moment.js** - Date/time handling

### Frontend
- **Chart.js** - Data visualization
- **Vanilla JavaScript** - Interactive features
- **CSS3** - Discord-inspired dark theme

### File Structure
```
dashboard/
├── server.js           # Express server
├── analytics.js        # Analytics calculations
├── views/              # EJS templates
│   ├── dashboard.ejs   # Overview page
│   ├── messages.ejs    # Messages analytics
│   ├── points.ejs      # Points leaderboard
│   └── settings.ejs    # Settings page
├── public/             # Static assets
│   ├── css/
│   │   └── style.css   # Main stylesheet
│   └── js/             # Client-side scripts
├── points-config.json  # Points configuration
└── settings.json       # Server settings
```

## Features Comparison with Statbot

| Feature | Statbot | StatRekt |
|---------|---------|----------|
| DAU/WAU/MAU | ✅ | ✅ |
| Message Stats | ✅ | ✅ |
| Channel Analytics | ✅ | ✅ |
| Category Analytics | ❌ | ✅ |
| Character Count | Limited | ✅ Full Stats |
| Reactions | ✅ | ✅ |
| Replies | ❌ | ✅ |
| Points System | ❌ | ✅ |
| Role Groups | Limited | ✅ |
| Role Exclusions | ❌ | ✅ |
| Timeframe Comparison | ❌ | ✅ |
| Self-Hosted | ❌ | ✅ |
| No Premium Required | ❌ | ✅ |

## Performance

The dashboard is optimized for large servers:
- Efficient SQLite queries with proper indexing
- Pagination for large datasets
- Client-side caching
- Responsive design for all devices

## Troubleshooting

### Dashboard won't start
- Make sure you've run `npm install` first
- Verify a .db file exists in the project root
- Check that port 3000 (or your custom port) is available

### No data showing
- Ensure the Discord bot has been running and collecting data
- Verify the database file is not empty
- Check the console for error messages

### Points not calculating correctly
- Verify points configuration is saved
- Check that excluded roles are set up correctly
- Reload the page after changing configuration

## License

ISC

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## Support

For issues or questions, please check the existing issues or create a new one.
