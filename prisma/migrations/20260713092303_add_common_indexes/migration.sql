-- CreateIndex
CREATE INDEX "Appointment_deletedAt_idx" ON "Appointment"("deletedAt");

-- CreateIndex
CREATE INDEX "DoctorSchedule_deletedAt_idx" ON "DoctorSchedule"("deletedAt");

-- CreateIndex
CREATE INDEX "HotelBooking_deletedAt_idx" ON "HotelBooking"("deletedAt");

-- CreateIndex
CREATE INDEX "InventoryBatch_deletedAt_idx" ON "InventoryBatch"("deletedAt");

-- CreateIndex
CREATE INDEX "InventoryBatch_currentQty_idx" ON "InventoryBatch"("currentQty");

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "MedicalRecord_deletedAt_idx" ON "MedicalRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Queue_deletedAt_idx" ON "Queue"("deletedAt");
