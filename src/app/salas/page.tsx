import { SalasScreen } from "@/components/screens/SalasScreen";
import { AppNav } from "@/components/layout/AppNav";

export default function SalasPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />
      <SalasScreen />
    </div>
  );
}
