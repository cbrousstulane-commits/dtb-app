import BoatEditPage from "@/components/admin/BoatEditPage";

type PageProps = {
  params: Promise<{
    boatId: string;
  }>;
};

export default async function AdminBoatDetailPage({ params }: PageProps) {
  const { boatId } = await params;

  return <BoatEditPage boatId={boatId} />;
}

