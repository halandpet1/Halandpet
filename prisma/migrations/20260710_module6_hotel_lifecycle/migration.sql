-- AlterTable
ALTER TABLE "HotelBooking" ALTER COLUMN "roomId" DROP NOT NULL;

-- AlterEnum
ALTER TYPE "HotelBookingStatus" ADD VALUE 'WAITING_LIST';
ALTER TYPE "HotelBookingStatus" ADD VALUE 'NO_SHOW';
