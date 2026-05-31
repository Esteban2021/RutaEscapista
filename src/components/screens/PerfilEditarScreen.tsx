"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { UserCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { updatePerfil } from "@/lib/usuarios";
import { uploadAvatar } from "@/lib/storage";
import { ImageCropPicker } from "@/components/ui/ImageCropPicker";

const AVATAR_SIZE = 200; // crop area: 200×200 px

const schema = z.object({
  nick: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(30, "Máximo 30 caracteres")
    .trim(),
  nombre: z.string().max(60, "Máximo 60 caracteres").optional(),
  pais: z.string().optional(),
  provincia: z.string().max(40, "Máximo 40 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export function PerfilEditarScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { user, perfil, setPerfil } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const isOnboarding = !perfil?.nick;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nick: perfil?.nick ?? "",
      nombre: perfil?.nombre ?? "",
      pais: perfil?.pais ?? "",
      provincia: perfil?.provincia ?? "",
    },
  });

  async function handleAvatarSave(cardBlob: Blob, originalBlob: Blob, ext: string) {
    if (!user || !perfil) return;
    const [fotoUrl, fotoOriginalUrl] = await Promise.all([
      uploadAvatar(user.uid, "main", cardBlob, "jpg"),
      uploadAvatar(user.uid, "original", originalBlob, ext),
    ]);
    await updatePerfil(user.uid, { fotoUrl, fotoOriginalUrl });
    setPerfil({ ...perfil, fotoUrl, fotoOriginalUrl });
  }

  async function onSubmit(data: FormValues) {
    if (!user || !perfil) return;
    setError(null);
    try {
      const updates = {
        nick: data.nick,
        ...(data.nombre ? { nombre: data.nombre } : {}),
        ...(data.pais ? { pais: data.pais } : {}),
        ...(data.provincia ? { provincia: data.provincia } : {}),
      };
      await updatePerfil(user.uid, updates);
      setPerfil({ ...perfil, ...updates });
      router.push(isOnboarding && redirect ? redirect : "/perfil");
    } catch {
      setError("Error al guardar. Inténtalo de nuevo.");
    }
  }

  const nick = watch("nick");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h1 className="text-xl font-bold text-[#334155]">
            {isOnboarding ? "Completa tu perfil" : "Editar perfil"}
          </h1>
          {isOnboarding && (
            <p className="text-sm text-slate-500 -mt-4">
              Elige un nick para continuar.
            </p>
          )}

          {/* Datos del perfil */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">
                Nick <span className="text-red-500">*</span>
              </label>
              <input {...register("nick")} placeholder="Tu nick público" className={inputCls} />
              {errors.nick && <p className="text-xs text-red-500 mt-1">{errors.nick.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">
                Nombre real <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input {...register("nombre")} placeholder="Solo visible para ti" className={inputCls} />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">País</label>
                <input {...register("pais")} placeholder="España" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Provincia</label>
                <input {...register("provincia")} placeholder="Madrid" className={inputCls} />
              </div>
            </div>

            {/* Foto de perfil */}
            {!isOnboarding && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-[#334155]">Foto de perfil</p>
                  {perfil?.fotoUrl ? (
                    <Image
                      src={perfil.fotoUrl}
                      alt={perfil.nick}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-teal-600" />
                    </div>
                  )}
                </div>
                <ImageCropPicker
                  cropW={AVATAR_SIZE}
                  cropH={AVATAR_SIZE}
                  shape="circle"
                  avatarLabel={nick || perfil?.nick}
                  currentCardUrl={perfil?.fotoUrl}
                  canvasBackground="#f0fdfa"
                  onSave={handleAvatarSave}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              {!isOnboarding && (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 border border-slate-200 text-[#334155] py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
