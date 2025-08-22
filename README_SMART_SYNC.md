# Smart Sync Scheduler

## Overview

The Smart Sync Scheduler automatically runs the smart inventory synchronization every 10 minutes (configurable). This ensures that your BaseLinker and Ovoko inventories stay synchronized with minimal manual intervention.

## Features

- **Automatic Scheduling**: Runs smart sync every 10 minutes by default
- **Configurable Interval**: Easy to adjust the sync frequency
- **Status Monitoring**: Track sync status, last run, and next run time
- **Manual Control**: Start, stop, or manually trigger syncs
- **Error Handling**: Robust error handling and logging
- **Configuration File**: Easy configuration management

## Configuration

### Configuration File

Edit `smart_sync_config.json` to customize the scheduler:

```json
{
  "interval": 10,
  "enabled": true,
  "description": "Smart sync configuration - interval in minutes"
}
```

- `interval`: Sync frequency in minutes (default: 10)
- `enabled`: Enable/disable the scheduler (default: true)

### Environment Variables

The scheduler uses the same credentials as defined in your existing configuration:
- BaseLinker API token
- Ovoko credentials (username, password, user token)

## API Endpoints

### Get Status

```http
GET /api/smart-sync/status
```

Returns current scheduler status including:
- Running state
- Last run time
- Next run time
- Total runs
- Current interval
- Enabled status

### Control Scheduler

```http
POST /api/smart-sync/control
```

Actions available:

#### Start Scheduler
```json
{
  "action": "start"
}
```

#### Stop Scheduler
```json
{
  "action": "stop"
}
```

#### Manual Trigger
```json
{
  "action": "trigger"
}
```

#### Update Configuration
```json
{
  "action": "update-config",
  "config": {
    "interval": 15,
    "enabled": true
  }
}
```

## Usage

### Automatic Startup

The scheduler starts automatically when the server starts. You'll see these log messages:

```
🔄 Starting smart sync scheduler...
🚀 Starting Smart Sync Scheduler...
⏰ Running smart sync every 10 minutes
✅ Smart sync scheduler started successfully
```

### Manual Control

You can control the scheduler through the API endpoints or programmatically:

```javascript
const { smartSyncScheduler } = require('./smart_sync_scheduler');

// Start the scheduler
await smartSyncScheduler.start();

// Stop the scheduler
smartSyncScheduler.stop();

// Trigger a manual sync
const result = await smartSyncScheduler.triggerSync();

// Get current status
const status = smartSyncScheduler.getStatus();

// Update configuration
const newStatus = smartSyncScheduler.updateConfig({ interval: 15 });
```

### Monitoring

The scheduler provides comprehensive status information:

```javascript
{
  "isRunning": true,
  "lastRun": "2025-01-22T10:30:00.000Z",
  "nextRun": "2025-01-22T10:40:00.000Z",
  "totalRuns": 5,
  "lastError": null,
  "interval": 600000,
  "intervalMinutes": 10,
  "enabled": true
}
```

## Integration

### Server Integration

The scheduler is automatically integrated into your main server and starts with it. It's also included in the overview endpoint:

```http
GET /api/overview
```

Returns smart sync information in the response:

```json
{
  "smartSync": {
    "isRunning": true,
    "lastRun": "2025-01-22T10:30:00.000Z",
    "nextRun": "2025-01-22T10:40:00.000Z",
    "totalRuns": 5,
    "intervalMinutes": 10,
    "enabled": true
  }
}
```

### Dashboard Integration

The smart sync status is automatically included in your dashboard overview, showing:
- Current sync status
- Last sync time
- Next scheduled sync
- Total syncs performed

## Testing

Run the test script to verify the scheduler works correctly:

```bash
node test_smart_sync_scheduler.js
```

This will test:
- Initial status
- Starting/stopping
- Manual triggers
- Configuration updates
- Error handling

## Troubleshooting

### Common Issues

1. **Scheduler won't start**
   - Check if `smart_sync_config.json` exists and is valid JSON
   - Verify credentials are correct
   - Check server logs for error messages

2. **Syncs not running**
   - Ensure scheduler is enabled in config
   - Check if BaseLinker API is accessible
   - Verify Ovoko credentials

3. **Configuration not updating**
   - Restart the scheduler after config changes
   - Check file permissions on config file
   - Verify JSON syntax

### Logs

The scheduler provides detailed logging:
- Startup/shutdown messages
- Sync execution logs
- Error details
- Configuration changes

### Error Handling

Errors are logged and don't stop the scheduler:
- Failed syncs are logged with details
- Scheduler continues running on errors
- Manual intervention may be required for persistent issues

## Performance

- **Memory Usage**: Minimal - only stores status and configuration
- **CPU Usage**: Low - only active during sync execution
- **Network**: Uses existing BaseLinker and Ovoko API calls
- **Storage**: Creates sync reports and logs as configured

## Security

- All endpoints require authentication
- Credentials are stored securely
- API access is restricted to authenticated users
- No sensitive data is exposed in status endpoints

## Future Enhancements

Potential improvements:
- Email notifications for sync failures
- More granular scheduling (specific times, days)
- Sync performance metrics
- Integration with monitoring systems
- Webhook support for external notifications 