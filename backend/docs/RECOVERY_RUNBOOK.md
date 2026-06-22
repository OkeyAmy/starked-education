# StarkEd Database Recovery Runbook

This document outlines the procedure to restore the PostgreSQL database from our automated encrypted backups.

## Backup Strategy Overview
- **Location:** Local (`/tmp/backups`) and Cloud Storage (AWS S3: `s3://starked-backups`)
- **Encryption:** AES-256 (Key managed via `BACKUP_ENCRYPTION_KEY` env var)
- **Retention:** 7 daily, 4 weekly, 3 monthly
- **WAL Archiving:** Configured in PostgreSQL for Point-In-Time Recovery (PITR).

## Prerequisites
- Access to the target PostgreSQL server.
- The `BACKUP_ENCRYPTION_KEY` password.
- AWS CLI configured (if restoring from S3).

## Restoring a Standard Backup (Full Restore)

1. **Locate the Backup:**
   Find the encrypted backup file locally or download it from S3:
   ```bash
   aws s3 ls s3://starked-backups/daily/
   aws s3 cp s3://starked-backups/daily/starked_daily_YYYYMMDD_HHMMSS.sql.enc .
   ```

2. **Execute the Restore Script:**
   The `restore.sh` script will prompt you for confirmation before dropping the existing database and restoring the data.
   ```bash
   export DATABASE_HOST=localhost
   export DATABASE_USER=postgres
   export BACKUP_ENCRYPTION_KEY="your-secret-key"
   
   npm run db:restore -- /path/to/backup.sql.enc
   # or
   bash backend/scripts/restore.sh /path/to/backup.sql.enc
   ```

## Testing Backups (Verification)
Weekly verification is performed using the `--verify` flag, which tests the restore on a temporary database and automatically cleans it up on success.
```bash
bash backend/scripts/restore.sh /path/to/backup.sql.enc --verify
```

## Point-In-Time Recovery (PITR) using WAL
If you need to recover to a specific point in time (e.g., right before an accidental table drop), follow these steps:

1. Stop the PostgreSQL service.
2. Clear the PostgreSQL data directory (`rm -rf /var/lib/postgresql/data/*`).
3. Restore from a base backup (use `pg_basebackup` if configured, or setup standard PostgreSQL PITR procedure).
4. Create a `recovery.signal` file in the data directory.
5. Update `postgresql.conf` with the restore command:
   ```
   restore_command = 'cp /tmp/backups/wal_archive/%f %p'
   recovery_target_time = '2023-01-01 12:00:00 UTC'
   ```
6. Start PostgreSQL. It will replay the WAL logs up to the specified time.

## Handling Backup Failures
Alerts are sent to configured webhooks (e.g., Slack) if `backup.sh` fails.
You can also check the current status of backups via the status file:
```bash
cat backend/backup_status.json
```
If a failure occurs, verify:
- Disk space on the server.
- Database connectivity (`DATABASE_URL`).
- S3 permissions and AWS CLI configuration.
