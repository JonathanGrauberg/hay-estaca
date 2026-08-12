-- CreateEnum
CREATE TYPE "EstadoJuntada" AS ENUM ('proxima', 'pasada', 'archivada');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('voy', 'no_voy', 'en_duda');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apodo" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" DATE,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Juntada" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "mensajeFomo" TEXT,
    "estado" "EstadoJuntada" NOT NULL DEFAULT 'proxima',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Juntada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "juntadaId" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL DEFAULT 'en_duda',
    "respondidoAt" TIMESTAMP(3),

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "juntadaId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "asignadoAUserId" TEXT,
    "completado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "juntadaId" TEXT NOT NULL,
    "compradorUserId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoExclusion" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GastoExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Juntada_estado_idx" ON "Juntada"("estado");

-- CreateIndex
CREATE INDEX "Juntada_fecha_idx" ON "Juntada"("fecha");

-- CreateIndex
CREATE INDEX "Asistencia_juntadaId_idx" ON "Asistencia"("juntadaId");

-- CreateIndex
CREATE INDEX "Asistencia_userId_idx" ON "Asistencia"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_userId_juntadaId_key" ON "Asistencia"("userId", "juntadaId");

-- CreateIndex
CREATE INDEX "ChecklistItem_juntadaId_idx" ON "ChecklistItem"("juntadaId");

-- CreateIndex
CREATE INDEX "ChecklistItem_asignadoAUserId_idx" ON "ChecklistItem"("asignadoAUserId");

-- CreateIndex
CREATE INDEX "Gasto_juntadaId_idx" ON "Gasto"("juntadaId");

-- CreateIndex
CREATE INDEX "Gasto_compradorUserId_idx" ON "Gasto"("compradorUserId");

-- CreateIndex
CREATE INDEX "GastoExclusion_gastoId_idx" ON "GastoExclusion"("gastoId");

-- CreateIndex
CREATE INDEX "GastoExclusion_userId_idx" ON "GastoExclusion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GastoExclusion_gastoId_userId_key" ON "GastoExclusion"("gastoId", "userId");

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_juntadaId_fkey" FOREIGN KEY ("juntadaId") REFERENCES "Juntada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_juntadaId_fkey" FOREIGN KEY ("juntadaId") REFERENCES "Juntada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_asignadoAUserId_fkey" FOREIGN KEY ("asignadoAUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_juntadaId_fkey" FOREIGN KEY ("juntadaId") REFERENCES "Juntada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_compradorUserId_fkey" FOREIGN KEY ("compradorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoExclusion" ADD CONSTRAINT "GastoExclusion_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoExclusion" ADD CONSTRAINT "GastoExclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
