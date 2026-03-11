import LodgeRoomEditPage from "@/components/admin/LodgeRoomEditPage";

type PageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function AdminLodgeRoomDetailPage({ params }: PageProps) {
  const { roomId } = await params;

  return <LodgeRoomEditPage roomId={roomId} />;
}