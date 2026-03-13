import BoatTripTypeRateEditPage from "@/components/admin/BoatTripTypeRateEditPage";

type PageProps = {
  params: Promise<{
    rateId: string;
  }>;
};

export default async function AdminBoatRateDetailPage({ params }: PageProps) {
  const { rateId } = await params;

  return <BoatTripTypeRateEditPage rateId={rateId} />;
}
