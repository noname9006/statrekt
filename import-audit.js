const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const monitor = require('./monitor');  // Using the existing monitor module for DB operations

/**
 * Import role-related audit logs after exportguild operations
 * @param {Object} guild - Discord.js Guild object
 * @param {Object} options - Options for importing audit logs
 * @param {number} options.batchSize - Number of logs to fetch per batch
 * @returns {Promise<Object>} - Statistics about imported audit logs
 */
async function importRoleAuditLogs(guild, options = {}) {
  console.log(`[${getCurrentTime()}] Starting to import role audit logs for guild: ${guild.name} (${guild.id})`);
  console.log(`[${getCurrentTime()}] Options:`, JSON.stringify(options));
  
  const config = {
    batchSize: options.batchSize || 100,
    maxPages: options.maxPages || 1000  // This will fetch up to 1000 entries (10 pages * 100 entries)
  };

  // Define the audit log types we're interested in
  const roleAuditLogTypes = [
    AuditLogEvent.MemberRoleUpdate,  // Type 25
  ];

  console.log(`[${getCurrentTime()}] Audit log types to fetch:`, roleAuditLogTypes);

  const stats = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  // Fetch role audit logs
  try {
    console.log(`[${getCurrentTime()}] About to call fetchRoleAuditLogs`);
    const roleAuditLogs = await fetchRoleAuditLogs(guild, roleAuditLogTypes, config);
    console.log(`[${getCurrentTime()}] fetchRoleAuditLogs returned ${roleAuditLogs.length} logs`);
    stats.fetched = roleAuditLogs.length;
    
    console.log(`[${getCurrentTime()}] Fetched ${roleAuditLogs.length} role audit logs`);
    
    // Sample the first few logs to verify content
    if (roleAuditLogs.length > 0) {
      console.log(`[${getCurrentTime()}] Sample of first 3 logs:`, 
                   roleAuditLogs.slice(0, 3));
    }
    
    // Process and store the audit logs
    if (roleAuditLogs.length > 0) {
      console.log(`[${getCurrentTime()}] About to call storeRoleAuditLogs`);
      const result = await storeRoleAuditLogs(roleAuditLogs);
      console.log(`[${getCurrentTime()}] storeRoleAuditLogs returned:`, result);
      stats.inserted = result.inserted;
      stats.skipped = result.skipped;
      stats.errors = result.errors;
    }
    
    console.log(`[${getCurrentTime()}] Role audit log import complete: ${JSON.stringify(stats)}`);
    return stats;
  } catch (error) {
    console.error(`[${getCurrentTime()}] Error importing role audit logs:`, error);
    console.error(`[${getCurrentTime()}] Stack trace:`, error.stack);
    throw error;
  }
}

/**
 * Fetches role-related audit logs from a guild
 * @param {Object} guild - Discord.js Guild object
 * @param {Array<number>} types - Audit log types to fetch
 * @param {Object} config - Configuration options
 * @returns {Promise<Array>} - Processed audit logs
 */
async function fetchRoleAuditLogs(guild, types, config) {
  console.log(`[${getCurrentTime()}] Fetching role audit logs for guild: ${guild.name} (${guild.id})`);
  console.log(`[${getCurrentTime()}] Audit log types:`, types);
  
  const hasPermission = guild.members.me.permissions.has(1 << 7); // 128 = VIEW_AUDIT_LOG
  console.log(`[${getCurrentTime()}] Permissions check - Bot has VIEW_AUDIT_LOG:`, hasPermission);
    
  const allLogs = [];
  
  for (const type of types) {
    // Find the corresponding name for logging purposes
    const typeName = Object.keys(AuditLogEvent).find(key => 
      AuditLogEvent[key] === type
    ) || type;
    
    console.log(`[${getCurrentTime()}] Fetching logs of type: ${typeName} (${type})`);
    
    try {
      // Pagination variables
      let lastId = null;
      let hasMore = true;
      let pageCount = 0;
      const maxPages = config.maxPages || 10; // Default to 10 pages (1000 entries)
      
      // Loop until we've fetched all logs or reached the maximum page count
      while (hasMore && pageCount < maxPages) {
        pageCount++;
        console.log(`[${getCurrentTime()}] Fetching batch ${pageCount} with batch size ${config.batchSize}`);
        
        // Build fetch options
        const fetchOptions = { 
          limit: config.batchSize,
          type: type 
        };
        
        // If we have a lastId, use it for pagination
        if (lastId) {
          fetchOptions.before = lastId;
        }
        
        console.log(`[${getCurrentTime()}] Fetch options:`, JSON.stringify(fetchOptions));
        
        const fetchedLogs = await guild.fetchAuditLogs(fetchOptions);
        console.log(`[${getCurrentTime()}] Fetched ${fetchedLogs.entries.size} audit log entries for batch ${pageCount}`);
        
        if (fetchedLogs.entries.size === 0) {
          console.log(`[${getCurrentTime()}] No more entries for type ${typeName} (${type})`);
          hasMore = false;
        } else {
          console.log(`[${getCurrentTime()}] Processing ${fetchedLogs.entries.size} entries from batch ${pageCount}`);
          
          // Log the first entry of the batch to see its structure
          if (fetchedLogs.entries.size > 0) {
            const firstEntry = fetchedLogs.entries.first();
            console.log(`[${getCurrentTime()}] First entry in batch ${pageCount} sample:`, JSON.stringify({
              id: firstEntry.id,
              action: firstEntry.action,
              actionType: firstEntry.actionType,
              targetType: firstEntry.targetType,
              targetId: firstEntry.target ? firstEntry.target.id : 'undefined',
              changes: firstEntry.changes ? firstEntry.changes.map(c => ({key: c.key, old: c.old, new: c.new})) : null,
              createdTimestamp: firstEntry.createdTimestamp
            }));
          }
          
          // Process and add each log entry to allLogs
          for (const [id, entry] of fetchedLogs.entries) {
            // Filter for role update actions
            if (entry.action === AuditLogEvent.MemberRoleUpdate) {
              // Process the role changes
              const roleChanges = processRoleChanges(entry);
              
              // If we have role changes, add them to allLogs
              if (roleChanges.length > 0) {
                for (const change of roleChanges) {
                  allLogs.push({
                    memberId: entry.target ? entry.target.id : null,
                    roleId: change.roleId,
                    action: change.changeType,
                    timestamp: entry.createdTimestamp
                  });
                }
              }
            }
          }
          
          // Get the ID of the last entry for the next pagination request
          if (fetchedLogs.entries.size > 0) {
            const entries = [...fetchedLogs.entries.values()];
            const lastEntry = entries[entries.length - 1];
            lastId = lastEntry.id;
            console.log(`[${getCurrentTime()}] Last entry ID for pagination: ${lastId}`);
          }
          
          // If we didn't get a full batch, we've reached the end
          if (fetchedLogs.entries.size < config.batchSize) {
            console.log(`[${getCurrentTime()}] Received less than batch size (${fetchedLogs.entries.size} < ${config.batchSize}), no more entries to fetch`);
            hasMore = false;
          }
        }
        
        // Add a small delay between API requests to avoid rate limits
        if (hasMore) {
          console.log(`[${getCurrentTime()}] Waiting 1 second before next batch request...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (pageCount >= maxPages) {
        console.log(`[${getCurrentTime()}] Reached maximum page count (${maxPages}), stopping pagination`);
      }
      
    } catch (error) {
      console.error(`[${getCurrentTime()}] Error fetching logs of type ${typeName} (${type}):`, error);
      console.error(`[${getCurrentTime()}] Stack trace:`, error.stack);
    }
  }
  
  console.log(`[${getCurrentTime()}] Total role audit logs processed: ${allLogs.length}`);
  return allLogs;
}

/**
 * Process role changes from an audit log entry
 * @param {Object} entry - Audit log entry
 * @returns {Array} - Array of role change objects
 */
function processRoleChanges(entry) {
  const roleChanges = [];
  
  if (!entry.changes) {
    return roleChanges;
  }
  
  // Look for role-related changes
  entry.changes.forEach(change => {
    if (change.key === '$add' || change.key === '$remove') {
      const changeType = change.key === '$add' ? 'add' : 'remove';
      
      // Process each role in the change
      if (Array.isArray(change.new) || Array.isArray(change.old)) {
        const roles = (change.new || change.old || []);
        
        roles.forEach(role => {
          if (role.id) {
            roleChanges.push({
              roleId: role.id,
              changeType: changeType
            });
          }
        });
      }
    }
  });
  
  return roleChanges;
}

/**
 * Store role audit logs in the database
 * @param {Array} roleLogs - Processed role audit logs
 * @returns {Promise<Object>} - Statistics about stored logs
 */
async function storeRoleAuditLogs(roleLogs) {
  console.log(`[${getCurrentTime()}] Storing ${roleLogs.length} role audit logs`);
  
  const stats = {
    inserted: 0,
    skipped: 0,
    errors: 0
  };
  
  const db = monitor.getDatabase();
  if (!db) {
    throw new Error("Database not initialized");
  }
  
  for (const log of roleLogs) {
    try {
      // Skip if any required field is missing
      if (!log.memberId || !log.roleId || !log.action || !log.timestamp) {
        console.log(`[${getCurrentTime()}] Skipping log with missing fields:`, log);
        stats.skipped++;
        continue;
      }

      // Check if entry already exists with the same parameters
      const checkSql = `
        SELECT id FROM role_history 
        WHERE memberId = ? AND roleId = ? AND 
              action = ? AND timestamp = ?
      `;
      
      const existingEntry = await new Promise((resolve, reject) => {
        db.get(checkSql, [
          log.memberId,
          log.roleId,
          log.action,
          log.timestamp
        ], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
      
      if (existingEntry) {
        // Entry already exists, skip
        stats.skipped++;
        continue;
      }
      
      // Insert new entry
      const insertSql = `
        INSERT INTO role_history 
        (memberId, roleId, action, timestamp)
        VALUES (?, ?, ?, ?)
      `;
      
      await new Promise((resolve, reject) => {
        db.run(insertSql, [
          log.memberId,
          log.roleId,
          log.action,
          log.timestamp
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });
      
      stats.inserted++;
    } catch (error) {
      console.error(`[${getCurrentTime()}] Error storing role audit log:`, error);
      stats.errors++;
    }
  }
  
  console.log(`[${getCurrentTime()}] Role audit log storage complete: ${JSON.stringify(stats)}`);
  return stats;
}

/**
 * Get current time in ISO format
 * @returns {string} - Current time in ISO format
 */
function getCurrentTime() {
  return new Date().toISOString();
}

module.exports = {
  importRoleAuditLogs,
  fetchRoleAuditLogs,
  processRoleChanges,
  storeRoleAuditLogs
};