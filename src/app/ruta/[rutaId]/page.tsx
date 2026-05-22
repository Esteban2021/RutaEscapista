import { RutaDetailScreen } from "@/components/screens/RutaDetailScreen";
import { AppNav } from "@/components/layout/AppNav";

interface Props {
  params: Promise<{ rutaId: string }>;
}

export default async function RutaDetailPage({ params }: Props) {
  const { rutaId } = await params;
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />
      <RutaDetailScreen rutaId={rutaId} />
    </div>
  );
}
