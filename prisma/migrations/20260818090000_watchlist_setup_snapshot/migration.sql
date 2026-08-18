-- AlterTable
ALTER TABLE "WatchlistItem" ADD COLUMN     "setupTimeframe" TEXT,
ADD COLUMN     "setupDirection" TEXT,
ADD COLUMN     "setupEntry" DOUBLE PRECISION,
ADD COLUMN     "setupTarget1" DOUBLE PRECISION,
ADD COLUMN     "setupTarget2" DOUBLE PRECISION,
ADD COLUMN     "setupStopLoss" DOUBLE PRECISION,
ADD COLUMN     "setupRiskReward" DOUBLE PRECISION,
ADD COLUMN     "setupConfidence" INTEGER,
ADD COLUMN     "setupSavedAt" TIMESTAMP(3);
