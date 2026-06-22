#!/bin/bash

# ==============================================================================
# Database Restore Script with Decryption and Verification
# ==============================================================================
# This script restores a PostgreSQL database backup. It decrypts the backup
# file (AES-256) and restores it using pg_restore. It also supports a
# verification mode to test restores weekly.
# ==============================================================================

set -e

# Configuration
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-postgres}
DB_NAME=${DATABASE_NAME:-starked}
PGPASSWORD=${DATABASE_PASSWORD:-postgres}
export PGPASSWORD

ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-"my-super-secret-aes-256-key"}

# Arguments
BACKUP_FILE=$1
MODE=$2

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <path_to_encrypted_backup_file> [--verify]"
    echo "Example: $0 /tmp/backups/daily/starked_daily_20230101_120000.sql.enc"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    # Try downloading from S3 if it's an S3 URI
    if [[ "$BACKUP_FILE" == s3://* ]]; then
        echo "Downloading backup from S3..."
        aws s3 cp "$BACKUP_FILE" /tmp/downloaded_backup.enc
        BACKUP_FILE="/tmp/downloaded_backup.enc"
    else
        echo "Error: File $BACKUP_FILE does not exist."
        exit 1
    fi
fi

# Verification mode
if [ "$MODE" == "--verify" ]; then
    echo "Running in verification mode. Restoring to a temporary database to test..."
    RESTORE_DB_NAME="${DB_NAME}_verify_$(date +%s)"
    
    # Create test DB
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $RESTORE_DB_NAME;"
else
    RESTORE_DB_NAME=$DB_NAME
    echo "WARNING: This will overwrite the existing database '$RESTORE_DB_NAME'."
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    # Drop and recreate target DB
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $RESTORE_DB_NAME WITH (FORCE);"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $RESTORE_DB_NAME;"
fi

DECRYPTED_FILE="/tmp/decrypted_backup_$$.sql"

echo "Decrypting backup file..."
openssl enc -d -aes-256-cbc -in "$BACKUP_FILE" -out "$DECRYPTED_FILE" -pass pass:"$ENCRYPTION_KEY" -pbkdf2

echo "Restoring database into $RESTORE_DB_NAME..."
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$RESTORE_DB_NAME" -1 "$DECRYPTED_FILE" || {
    echo "Restore failed!"
    rm -f "$DECRYPTED_FILE"
    exit 1
}

echo "Restore completed successfully."

if [ "$MODE" == "--verify" ]; then
    echo "Verification successful. Cleaning up temporary database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE $RESTORE_DB_NAME;"
    echo "Weekly verification test passed."
fi

# Cleanup decrypted file
rm -f "$DECRYPTED_FILE"
