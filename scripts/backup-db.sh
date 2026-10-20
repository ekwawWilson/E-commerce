#!/bin/bash
# Database Backup Script

set -e

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env ]; then
    source .env
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ecommerce_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="ecommerce-postgres"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "   Timestamp: $TIMESTAMP"
echo "   Output: $BACKUP_FILE"

# Create backup
docker exec "$CONTAINER_NAME" pg_dump \
    -U "${POSTGRES_USER:-ecommerce}" \
    -d "${POSTGRES_DB:-ecommerce}" \
    --format=custom \
    --compress=9 \
    > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup completed successfully!"
echo "   File: $BACKUP_FILE"
echo "   Size: $FILE_SIZE"

# Optional: Remove old backups (keep last 7 days)
if [ "${CLEANUP_OLD_BACKUPS:-true}" = "true" ]; then
    echo "🧹 Cleaning up old backups..."
    find "$BACKUP_DIR" -name "ecommerce_backup_*.sql.gz" -mtime +7 -delete
    echo "   Removed backups older than 7 days"
fi

# Optional: Upload to S3 or other storage
# if [ -n "$S3_BUCKET" ]; then
#     echo "☁️  Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
#     echo "   Uploaded to s3://$S3_BUCKET/backups/"
# fi
