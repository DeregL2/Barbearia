/*
  Warnings:

  - You are about to drop the column `preco` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "precoCorte" REAL NOT NULL DEFAULT 40.00,
    "precoSinal" REAL NOT NULL DEFAULT 20.00
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "fotoUrl" TEXT
);
INSERT INTO "new_User" ("descricao", "email", "fotoUrl", "id", "nome", "senha", "tipo") SELECT "descricao", "email", "fotoUrl", "id", "nome", "senha", "tipo" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
