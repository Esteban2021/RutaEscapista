import { EditarPartidaScreen } from "@/components/screens/EditarPartidaScreen";

export default function EditarPartidaPage({
  params,
}: {
  params: { salaId: string; partidaId: string };
}) {
  return <EditarPartidaScreen salaId={params.salaId} partidaId={params.partidaId} />;
}
