/*
  Warnings:

  - You are about to drop the column `subTeamId` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `Member` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'readonly',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubTeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subTeamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'readonly',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTeamMember_subTeamId_fkey" FOREIGN KEY ("subTeamId") REFERENCES "SubTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 从旧 Member 回填团队关系（在重建 Member 表之前）
INSERT INTO "TeamMember" ("id", "teamId", "userId", "role", "createdAt")
SELECT lower(hex(randomblob(16))), "teamId", "userId", "role", datetime('now')
FROM "Member"
WHERE "teamId" IS NOT NULL AND "subTeamId" IS NULL;

INSERT INTO "SubTeamMember" ("id", "subTeamId", "userId", "role", "createdAt")
SELECT lower(hex(randomblob(16))), "subTeamId", "userId", "role", datetime('now')
FROM "Member"
WHERE "subTeamId" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "permissions" JSONB NOT NULL DEFAULT [],
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("id", "permissions", "projectId", "role", "userId") SELECT "id", "permissions", "projectId", "role", "userId" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_userId_projectId_key" ON "Member"("userId", "projectId");
CREATE TABLE "new_SubTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTeam_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubTeam" ("createdAt", "id", "name", "phase", "projectId", "teamId") SELECT "createdAt", "id", "name", "phase", "projectId", "teamId" FROM "SubTeam";
DROP TABLE "SubTeam";
ALTER TABLE "new_SubTeam" RENAME TO "SubTeam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "SubTeamMember_userId_idx" ON "SubTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubTeamMember_subTeamId_userId_key" ON "SubTeamMember"("subTeamId", "userId");
