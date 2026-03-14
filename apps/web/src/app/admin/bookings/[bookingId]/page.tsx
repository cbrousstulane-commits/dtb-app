import BookingReviewPage from "@/components/admin/BookingReviewPage";

type AdminBookingReviewPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function AdminBookingReviewPage({ params }: AdminBookingReviewPageProps) {
  const { bookingId } = await params;
  return <BookingReviewPage bookingId={bookingId} />;
}
