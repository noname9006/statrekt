# statrekt

## Project Overview
Discord bot for guild statistics tracking and management.

## Language
JavaScript (Node.js)

## Dependencies
- discord.js
- dotenv
- node-cron
- sqlite3

## Main Components
- index.js: Main bot entry point with Discord client setup and command handlers
- monitor.js: Database operations and message monitoring functionality
- exportguild.js: Guild data export operations
- member-tracker.js: Member statistics and role change tracking
- channel-monitor.js: Channel monitoring and tracking
- wal-manager.js: Write-ahead log management for database operations
- vacuum.js: Database optimization operations
- vacuum-auto.js: Automated database vacuum scheduling
- config.js: Configuration settings management
- channelList.js: Channel listing operations
- import-audit.js: Role audit log import functionality
- member-left.js: Member departure tracking
- role-present.js: Role presence tracking
- db-manager.js: Database transaction management
- utils.js: Utility functions

## Commands
- !exportguild: Export guild data to SQLite database
- !channellist: Generate list of guild channels
- !vacuum: Optimize database
- !memberstats: Generate member statistics report
- !ex: Manage excluded channels from export

## Database
Uses SQLite for storing guild data, messages, member information, and role changes.

## Bot Invite
Discord bot application ID: 1371833204100698205

## Repository
https://github.com/noname9006/statrekt
