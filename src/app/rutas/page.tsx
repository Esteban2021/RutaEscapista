import { RutasScreen } from "@/components/screens/RutasScreen";
import { AppNav } from "@/components/layout/AppNav";

export default function RutasPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />
      <RutasScreen />
    </div>
  );
}
