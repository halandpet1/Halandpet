# Module 3 Slice 3

## Implemented Features
- Diagnosis entry with primary, secondary, and differential diagnosis fields.
- Clinical notes plus lock-after-completion support for diagnosis records.
- Treatment plan capture for medical treatment, procedure, observation, hospitalization recommendation, and follow-up recommendation.
- Prescription support with medicine, dosage, frequency, duration, instructions, quantity, refill, warnings, and status.
- Follow-up scheduling with next visit date, reminder, reason, and status.
- Prescription stock reservation using FEFO batch selection and stock movement generation inside Prisma transactions.

## Workflow
1. Doctor creates or updates a medical record.
2. Diagnosis is created against the medical record.
3. Treatment plan is created after diagnosis exists.
4. Prescription is created against a diagnosis and reserves stock.
5. Follow-up is created only after the consultation is completed and diagnosis is locked.

## Database Changes
- Added Diagnosis model linked to MedicalRecord.
- Added TreatmentPlan model linked to MedicalRecord.
- Added Prescription model linked to MedicalRecord, Diagnosis, Product, and InventoryBatch.
- Added FollowUp model linked to MedicalRecord.
- Added relation fields on User and MedicalRecord for the new clinical entities.

## Transactions
- Diagnosis create/update operations run inside Prisma transactions.
- Treatment plan creation runs inside Prisma transactions.
- Prescription creation reserves stock and writes a StockMovement inside a single Prisma transaction.
- Follow-up creation runs inside Prisma transactions.

## Audit
- Every create/update mutation writes an AuditLog entry.
- Audit entries capture the field changes for diagnosis, treatment plans, prescriptions, and follow-up records.

## RBAC
- Doctors, admins, and owners can create and manage Slice 3 clinical records.
- Read access is available to staff and other clinical roles through the existing role checks.

## Verification
Verified with:
- npm run lint
- npx tsc --noEmit
- npm run build
- npx prisma validate

## PRD Compliance
- Diagnosis requires a MedicalRecord.
- Prescription requires a Diagnosis.
- Treatment plan depends on Diagnosis being present.
- Follow-up requires the consultation to be completed and the diagnosis to be locked.
- Prescription stock is reserved using FEFO and stock movement generation.

## Known Limitations
- The current UI uses manual ID entry for medical record and diagnosis linkage.
- Diagnosis, treatment plan, and follow-up remain simple record structures and can be extended with richer forms later.
