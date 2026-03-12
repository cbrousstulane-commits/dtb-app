import AccessUserEditPage from "@/components/admin/AccessUserEditPage";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;

  return <AccessUserEditPage userId={userId} />;
}