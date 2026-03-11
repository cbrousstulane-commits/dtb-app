import TripTypeEditPage from "@/components/admin/TripTypeEditPage";

type PageProps = {
  params: Promise<{
    tripTypeId: string;
  }>;
};

export default async function AdminTripTypeDetailPage({ params }: PageProps) {
  const { tripTypeId } = await params;

  return <TripTypeEditPage tripTypeId={tripTypeId} />;
}