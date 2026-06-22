#!/bin/bash

# ==============================================================================
# Automated PostgreSQL Backup Script with Encryption and Retention Policy
# ==============================================================================
# This script performs automated backups of the PostgreSQL database, encrypts
# them using AES-256, stores them locally, and uploads them to AWS S3.
# It also manages retention policies: 7 daily, 4 weekly, 3 monthly.
#
# CRON Setup:
# 0 2 * * * /path/to/backend/scripts/backup.sh daily
# 0 3 * * 0 /path/to/backend/scripts/backup.sh weekly
# 0 4 1 * * /path/to/backend/scripts/backup.sh monthly
# ==============================================================================

set -e

# Configuration
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-postgres}
DB_NAME=${DATABASE_NAME:-starked}
PGPASSWORD=${DATABASE_PASSWORD:-postgres}
export PGPASSWORD

BACKUP_TYPE=${1:-daily} # daily, weekly, monthly
BACKUP_DIR=${BACKUP_DIR:-"/tmp/backups"}
S3_BUCKET=${S3_BUCKET:-"s3://starked-backups"}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-"my-super-secret-aes-256-key"}

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.sql"
ENCRYPTED_FILENAME="${BACKUP_FILENAME}.enc"
LOCAL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_TYPE}/${ENCRYPTED_FILENAME}"
STATUS_FILE="$(dirname "$0")/../backup_status.json"

# Alerting / Error Handling
handle_error() {
    local error_msg=$1
    echo "Backup failed: $error_msg"
    
    # Update status file with failure
    cat > "$STATUS_FILE" <<EOF
{
  "status": "failed",
  "error": "$error_msg",
  "timestamp": "$(date -Iseconds)"
}
EOF
    
    # Optional: Webhook alerting (e.g., Slack/Discord)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Database Backup Failed: $error_msg\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    exit 1
}

trap 'handle_error "An unexpected error occurred during execution at line $LINENO"' ERR

# Create directories
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"
mkdir -p "${BACKUP_DIR}/wal_archive"

echo "Starting $BACKUP_TYPE backup..."

# Perform database dump
# Note: For Point-In-Time Recovery (PITR), continuous WAL archiving should be enabled 
# in postgresql.conf (archive_mode = on, archive_command = 'cp %p /tmp/backups/wal_archive/%f').
# Here we take a full consistent logical backup.
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c -d "$DB_NAME" > "${BACKUP_DIR}/${BACKUP_FILENAME}" || handle_error "pg_dump failed"

# Encrypt backup at rest (AES-256)
openssl enc -aes-256-cbc -salt -in "${BACKUP_DIR}/${BACKUP_FILENAME}" -out "$LOCAL_BACKUP_PATH" -pass pass:"$ENCRYPTION_KEY" -pbkdf2 || handle_error "Encryption failed"

# Remove unencrypted dump
rm "${BACKUP_DIR}/${BACKUP_FILENAME}"

# Upload to Cloud Storage (AWS S3)
if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$LOCAL_BACKUP_PATH" "${S3_BUCKET}/${BACKUP_TYPE}/${ENCRYPTED_FILENAME}" || handle_error "S3 upload failed"
    echo "Uploaded to cloud storage: ${S3_BUCKET}/${BACKUP_TYPE}/${ENCRYPTED_FILENAME}"
else
    echo "AWS CLI not found. Skipping cloud upload. (In production, install aws-cli)"
fi

# Apply Retention Policies
apply_retention() {
    local type=$1
    local days=$2
    
    # Delete old local backups
    find "${BACKUP_DIR}/${type}" -name "*.enc" -type f -mtime +${days} -exec rm {} \;
    
    # Delete old S3 backups if aws cli is available
    if command -v aws >/dev/null 2>&1; then
        # This is a simple cleanup logic or you can use S3 lifecycle rules.
        echo "Note: In production, configure S3 lifecycle rules for $type (retain $days days)."
    fi
}

if [ "$BACKUP_TYPE" == "daily" ]; then
    apply_retention "daily" 7
elif [ "$BACKUP_TYPE" == "weekly" ]; then
    apply_retention "weekly" 28 # 4 weeks
    
    # Weekly backup verification
    echo "Running weekly backup verification..."
    bash "$(dirname "$0")/restore.sh" "$LOCAL_BACKUP_PATH" --verify || handle_error "Weekly backup verification failed"
elif [ "$BACKUP_TYPE" == "monthly" ]; then
    apply_retention "monthly" 90 # 3 months
fi

# Update status file
cat > "$STATUS_FILE" <<EOF
{
  "status": "success",
  "lastBackup": "$(date -Iseconds)",
  "type": "$BACKUP_TYPE",
  "file": "$LOCAL_BACKUP_PATH"
}
EOF

echo "Backup completed successfully: $LOCAL_BACKUP_PATH"
