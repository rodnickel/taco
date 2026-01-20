-- AlterTable: Adiciona suporte a monitores do tipo Webhook
ALTER TABLE "monitors" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'http';
ALTER TABLE "monitors" ADD COLUMN "webhook_token" TEXT;
ALTER TABLE "monitors" ADD COLUMN "webhook_secret" TEXT;
ALTER TABLE "monitors" ADD COLUMN "heartbeat_interval" INTEGER DEFAULT 300;
ALTER TABLE "monitors" ADD COLUMN "last_heartbeat" TIMESTAMP(3);

-- CreateIndex: Índice para webhook_token (unique)
CREATE UNIQUE INDEX "monitors_webhook_token_key" ON "monitors"("webhook_token");

-- CreateIndex: Índices para otimização
CREATE INDEX "monitors_type_idx" ON "monitors"("type");
CREATE INDEX "monitors_webhook_token_idx" ON "monitors"("webhook_token");
