import CustomerEditPage from "@/components/admin/CustomerEditPage";

type PageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params;

  return <CustomerEditPage customerId={customerId} />;
}