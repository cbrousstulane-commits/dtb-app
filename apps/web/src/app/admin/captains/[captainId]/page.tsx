import CaptainEditPage from "@/components/admin/CaptainEditPage";

type PageProps = {
  params: Promise<{
    captainId: string;
  }>;
};

export default async function AdminCaptainDetailPage({ params }: PageProps) {
  const { captainId } = await params;

  return <CaptainEditPage captainId={captainId} />;
}