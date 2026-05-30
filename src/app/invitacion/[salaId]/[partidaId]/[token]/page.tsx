import { InvitacionScreen } from "@/components/screens/InvitacionScreen";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ salaId: string; partidaId: string; token: string }>;
}) {
  const { salaId, partidaId, token } = await params;
  return <InvitacionScreen salaId={salaId} partidaId={partidaId} token={token} />;
}
