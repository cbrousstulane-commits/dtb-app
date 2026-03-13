import FishSpeciesEditPage from "@/components/admin/FishSpeciesEditPage";

export default async function AdminFishSpeciesDetailPage(props: { params: Promise<{ speciesId: string }> }) {
  const params = await props.params;
  return <FishSpeciesEditPage speciesId={params.speciesId} />;
}
