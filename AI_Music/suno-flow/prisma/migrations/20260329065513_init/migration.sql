-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "parameters" TEXT NOT NULL DEFAULT '{}',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "bpm" INTEGER,
    "musicalKey" TEXT,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'mp3',
    "noVocals" BOOLEAN NOT NULL DEFAULT false,
    "cleanStart" BOOLEAN NOT NULL DEFAULT false,
    "cleanEnd" BOOLEAN NOT NULL DEFAULT false,
    "noAwkwardTransitions" BOOLEAN NOT NULL DEFAULT false,
    "qualityApproved" BOOLEAN NOT NULL DEFAULT false,
    "qualityNotes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "mood" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "durationSec" INTEGER,
    "visualizerType" TEXT NOT NULL DEFAULT 'spectrum',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0a0a0a',
    "backgroundUrl" TEXT,
    "thumbnailUrl" TEXT,
    "outputPath" TEXT,
    "disclosureText" TEXT NOT NULL DEFAULT 'Music generated using Suno AI',
    "ytTitle" TEXT,
    "ytDescription" TEXT,
    "ytTags" TEXT NOT NULL DEFAULT '[]',
    "renderProgress" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VideoTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startSec" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VideoTrack_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTrack_videoId_order_key" ON "VideoTrack"("videoId", "order");
