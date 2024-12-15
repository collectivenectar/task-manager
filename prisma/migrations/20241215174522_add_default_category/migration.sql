-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('LLM_SUGGESTION', 'LLM_ANALYSIS', 'USER_FEEDBACK');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskInteraction" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskInteraction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskInteraction" ADD CONSTRAINT "TaskInteraction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
