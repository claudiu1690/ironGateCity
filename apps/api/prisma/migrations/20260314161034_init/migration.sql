-- CreateEnum
CREATE TYPE "Faction" AS ENUM ('FASCIST', 'COMMUNIST', 'DEMOCRAT');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('TRAINING', 'INTELLIGENCE', 'PROPAGANDA', 'DISRUPTION', 'SABOTAGE', 'POLITICAL', 'SOCIAL', 'OPERATION', 'COUNCIL', 'JOB');

-- CreateEnum
CREATE TYPE "MissionOutcome" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE', 'ENCOUNTER_WIN', 'ENCOUNTER_LOSS');

-- CreateEnum
CREATE TYPE "ItemSlot" AS ENUM ('WEAPON', 'ARMOUR', 'UTILITY', 'ACCESSORY', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "DossierCategory" AS ENUM ('POLITICAL', 'CRIMINAL', 'LOCATION', 'ASSET', 'UNCLEAR');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('NOMINATION', 'VOTING', 'CONCLUDED');

-- CreateEnum
CREATE TYPE "LawStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('CLEAR', 'RAIN', 'FOG', 'SNOW', 'HEAT_WAVE', 'FROST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),
    "stripeCustomerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "faction" "Faction" NOT NULL,
    "currentCityId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "str" INTEGER NOT NULL DEFAULT 10,
    "int" INTEGER NOT NULL DEFAULT 10,
    "agi" INTEGER NOT NULL DEFAULT 1,
    "factionRank" INTEGER NOT NULL DEFAULT 1,
    "factionXp" INTEGER NOT NULL DEFAULT 0,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "currentHealth" INTEGER NOT NULL DEFAULT 100,
    "ironMarks" INTEGER NOT NULL DEFAULT 0,
    "charisma" INTEGER NOT NULL DEFAULT 2,
    "lastFedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isHospitalised" BOOLEAN NOT NULL DEFAULT false,
    "hospitalisedUntil" TIMESTAMP(3),
    "criminalPoints" INTEGER NOT NULL DEFAULT 0,
    "lastOffenceAt" TIMESTAMP(3),
    "currentJobId" TEXT,
    "lastJobDoneAt" TIMESTAMP(3),
    "jobAbsences" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyState" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 100,
    "max" INTEGER NOT NULL DEFAULT 100,
    "lastTickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "influenceWeight" INTEGER NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityInfluence" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "fascistPct" DOUBLE PRECISION NOT NULL DEFAULT 33.33,
    "communistPct" DOUBLE PRECISION NOT NULL DEFAULT 33.33,
    "democratPct" DOUBLE PRECISION NOT NULL DEFAULT 33.34,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityInfluence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MissionType" NOT NULL,
    "faction" "Faction",
    "cityId" TEXT NOT NULL,
    "energyCost" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "minFactionRank" INTEGER NOT NULL DEFAULT 1,
    "minCha" INTEGER NOT NULL DEFAULT 0,
    "minAgi" INTEGER NOT NULL DEFAULT 0,
    "minStr" INTEGER NOT NULL DEFAULT 0,
    "xpReward" INTEGER NOT NULL,
    "fxpReward" INTEGER NOT NULL DEFAULT 0,
    "ironReward" INTEGER NOT NULL,
    "encounterChance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "influenceGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dossierReward" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "outcome" "MissionOutcome" NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "ironAwarded" INTEGER NOT NULL,
    "fxpAwarded" INTEGER NOT NULL,
    "rngSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentSlots" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "weaponId" TEXT,
    "armourId" TEXT,
    "utilityId" TEXT,
    "accessoryId" TEXT,
    "documentId" TEXT,

    CONSTRAINT "EquipmentSlots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "slot" "ItemSlot" NOT NULL,
    "tier" INTEGER NOT NULL,
    "faction" "Faction",
    "strBonus" INTEGER NOT NULL DEFAULT 0,
    "intBonus" INTEGER NOT NULL DEFAULT 0,
    "chaBonus" INTEGER NOT NULL DEFAULT 0,
    "defBonus" INTEGER NOT NULL DEFAULT 0,
    "fxpBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missionBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "acquireMethod" TEXT NOT NULL,
    "ironCost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerInventory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierEntry" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "category" "DossierCategory" NOT NULL,
    "subjectName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossierEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "energyCost" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "minStr" INTEGER NOT NULL DEFAULT 0,
    "minInt" INTEGER NOT NULL DEFAULT 0,
    "minAgi" INTEGER NOT NULL DEFAULT 0,
    "minFactionRank" INTEGER NOT NULL DEFAULT 0,
    "ironMinPay" INTEGER NOT NULL,
    "ironMaxPay" INTEGER NOT NULL,
    "cityId" TEXT,
    "requiresTravel" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bodyguard" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "dailyCost" INTEGER NOT NULL,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Bodyguard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "faction" "Faction" NOT NULL,
    "status" "ElectionStatus" NOT NULL,
    "nominationEnds" TIMESTAMP(3) NOT NULL,
    "votingEnds" TIMESTAMP(3) NOT NULL,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "manifesto" TEXT,
    "voteWeight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionVote" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivePresident" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "faction" "Faction" NOT NULL,
    "termEnds" TIMESTAMP(3) NOT NULL,
    "lawsProposed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivePresident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Law" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "effect" JSONB NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "status" "LawStatus" NOT NULL,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Law_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherState" (
    "id" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "weather" "Weather" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_key" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyState_characterId_key" ON "EnergyState"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CityInfluence_cityId_key" ON "CityInfluence"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentSlots_characterId_key" ON "EquipmentSlots"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionVote_electionId_voterId_key" ON "ElectionVote"("electionId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivePresident_characterId_key" ON "ActivePresident"("characterId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_currentCityId_fkey" FOREIGN KEY ("currentCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_currentJobId_fkey" FOREIGN KEY ("currentJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyState" ADD CONSTRAINT "EnergyState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityInfluence" ADD CONSTRAINT "CityInfluence_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionLog" ADD CONSTRAINT "MissionLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionLog" ADD CONSTRAINT "MissionLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_armourId_fkey" FOREIGN KEY ("armourId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentSlots" ADD CONSTRAINT "EquipmentSlots_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInventory" ADD CONSTRAINT "PlayerInventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInventory" ADD CONSTRAINT "PlayerInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierEntry" ADD CONSTRAINT "DossierEntry_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierEntry" ADD CONSTRAINT "DossierEntry_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bodyguard" ADD CONSTRAINT "Bodyguard_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVote" ADD CONSTRAINT "ElectionVote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVote" ADD CONSTRAINT "ElectionVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
