import { EditarSalaScreen } from "@/components/screens/EditarSalaScreen";

export default function EditarSalaPage({ params }: { params: { salaId: string } }) {
  return <EditarSalaScreen salaId={params.salaId} />;
}
