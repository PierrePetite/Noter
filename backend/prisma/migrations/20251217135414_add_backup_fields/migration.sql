-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "provider" TEXT NOT NULL DEFAULT 'local',
    "size" INTEGER NOT NULL,
    "path" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_backups" ("created_at", "id", "metadata", "path", "provider", "size", "status") SELECT "created_at", "id", "metadata", "path", "provider", "size", "status" FROM "backups";
DROP TABLE "backups";
ALTER TABLE "new_backups" RENAME TO "backups";
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");
CREATE INDEX "backups_status_idx" ON "backups"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
