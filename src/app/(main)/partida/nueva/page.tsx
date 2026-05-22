import { Suspense } from "react";
import { CrearPartidaScreen } from "@/components/screens/CrearPartidaScreen";

export default function NuevaPartidaPage() {
  return (
    <Suspense>
      <CrearPartidaScreen />
    </Suspense>
  );
}
