import { PartidaDetailScreen } from "@/components/screens/PartidaDetailScreen";

interface Props {
  params: Promise<{ salaId: string; partidaId: string }>;
}

export default async function PartidaDetailPage({ params }: Props) {
  const { salaId, partidaId } = await params;
  return <PartidaDetailScreen salaId={salaId} partidaId={partidaId} />;
}
