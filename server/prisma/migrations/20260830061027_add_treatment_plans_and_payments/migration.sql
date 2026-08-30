-- NOTE: Prisma's schema diff wanted to drop the four pg_trgm search indexes
-- here (Patient_firstName_trgm_idx etc.) because they were created by a
-- hand-written raw-SQL migration and are not expressible in schema.prisma
-- syntax, so Prisma doesn't know they're intentional. Removed those DROP
-- INDEX statements — this migration must only add the finance tables.

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TEXT,
    "completedDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "treatmentPlanId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "appointmentId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedReason" TEXT,
    "voidedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentPlan_patientId_idx" ON "TreatmentPlan"("patientId");

-- CreateIndex
CREATE INDEX "Payment_patientId_idx" ON "Payment"("patientId");

-- CreateIndex
CREATE INDEX "Payment_treatmentPlanId_idx" ON "Payment"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_visitId_idx" ON "Payment"("visitId");

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
