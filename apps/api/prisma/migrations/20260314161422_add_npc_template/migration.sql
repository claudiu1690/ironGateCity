-- CreateTable
CREATE TABLE "NpcTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faction" "Faction",
    "str" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "special" TEXT,

    CONSTRAINT "NpcTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NpcTemplate_slug_key" ON "NpcTemplate"("slug");
