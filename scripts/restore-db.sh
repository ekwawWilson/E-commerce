#!/bin/bash
# Database Restore Script

set -e

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env ]; then
    source .env
fi

# Configuration
CONTAINER_NAME="ecommerce-postgres"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -la ./backups/*.sql.gz 2>/dev/null || echo "   No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore the database from backup."
echo "   All current data will be replaced!"
echo ""
echo "   Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled."
    exit 0
fi

echo "🔄 Starting database restore..."

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "   Decompressing backup..."
    gunzip -k "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE%.gz}"
    CLEANUP_DECOMPRESSED=true
fi

# Restore database
echo "   Restoring database..."
docker exec -i "$CONTAINER_NAME" pg_restore \
    -U "${POSTGRES_USER:-ecommerce}" \
    -d "${POSTGRES_DB:-ecommerce}" \
    --clean \
    --if-exists \
    < "$BACKUP_FILE"

# Cleanup decompressed file
if [ "$CLEANUP_DECOMPRESSED" = true ]; then
    rm "$BACKUP_FILE"
fi

echo "✅ Database restored successfully!"
echo ""
echo "⚠️  You may need to restart the application:"
echo "   docker compose restart backend"
