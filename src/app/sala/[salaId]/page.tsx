import { SalaDetailScreen } from "@/components/screens/SalaDetailScreen";
import { AppNav } from "@/components/layout/AppNav";

export default function SalaPage({ params }: { params: { salaId: string } }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />
      <SalaDetailScreen salaId={params.salaId} />
    </div>
  );
}
