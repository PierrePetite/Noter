-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cron_schedule" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "retention" INTEGER NOT NULL DEFAULT 30,
    "last_run" DATETIME,
    "next_run" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
