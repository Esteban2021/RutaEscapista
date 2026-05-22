"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { crearSala } from "@/lib/salas";
import { extractCoordsFromGoogleMapsUrl, isGoogleMapsUrl, isShortGoogleMapsUrl } from "@/lib/geocoding";

const schema = z.object({
  nombreSala: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres").trim(),
  descripcion: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  webOficial: z.string().url("URL no válida").optional().or(z.literal("")),
  googleMapsUrl: z.string().min(1, "Pega un enlace de Google Maps"),
  ciudad: z.string().max(60).optional(),
  provincia: z.string().max(60).optional(),
  calle: z.string().max(100).optional(),
  cp: z.string().max(10).optional(),
  pais: z.string().min(1),
  duracionMinutos: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 10 && Number(v) <= 360), {
      message: "Entre 10 y 360 minutos",
    }),
  dificultad: z.enum(["facil", "media", "dificil"]).optional(),
});

type FormValues = z.infer<typeof schema>;

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#334155] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export function CrearSalaScreen() {
  const router = useRouter();
  const { user, perfil } = useAuthStore();
  const [coordsPreview, setCoordsPreview] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pais: "ES" },
  });

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Solo los administradores pueden crear salas</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  async function handleMapsUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const url = e.target.value.trim();
    setCoordsPreview(null);
    setCoordsError(null);
    if (!url) return;

    if (!isGoogleMapsUrl(url)) {
      setCoordsError("No parece una URL de Google Maps. Copia el enlace desde el navegador o usa 'Compartir → Copiar enlace'.");
      return;
    }

    let resolvedUrl = url;

    if (isShortGoogleMapsUrl(url)) {
      try {
        const res = await fetch(`/api/expand-url?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.expanded) {
          resolvedUrl = data.expanded;
        }
      } catch {
        setCoordsError("No se pudo expandir el enlace corto. Inténtalo de nuevo.");
        return;
      }
    }

    const coords = extractCoordsFromGoogleMapsUrl(resolvedUrl);
    if (!coords) {
      setCoordsError(
        "No se pudieron extraer las coordenadas. Asegúrate de que la URL incluya la ubicación exacta (abre Google Maps, busca el lugar, y copia la URL del navegador)."
      );
      return;
    }

    setCoordsPreview(coords);
    fillAddressFromCoords(coords.lat, coords.lng);
  }

  async function fillAddressFromCoords(lat: number, lng: number) {
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!res.ok) return;
      const data = await res.json();
      const a = data.address ?? {};

      const calle = [a.road, a.house_number].filter(Boolean).join(" ");
      const ciudad = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
      const provincia = a.county ?? a.state_district ?? a.state ?? "";
      const cp = a.postcode ?? "";
      const pais = (a.country_code ?? "es").toUpperCase();

      if (calle) setValue("calle", calle, { shouldValidate: false });
      if (ciudad) setValue("ciudad", ciudad, { shouldValidate: false });
      if (provincia) setValue("provincia", provincia, { shouldValidate: false });
      if (cp) setValue("cp", cp, { shouldValidate: false });
      setValue("pais", pais, { shouldValidate: false });
    } catch {
      // El relleno automático es opcional; si falla, el usuario rellena manualmente
    } finally {
      setGeocoding(false);
    }
  }

  async function onSubmit(data: FormValues) {
    if (!coordsPreview) {
      setCoordsError("Las coordenadas son obligatorias.");
      return;
    }
    if (!user) return;
    setSubmitError(null);

    try {
      const id = await crearSala({
        nombreSala: data.nombreSala,
        descripcion: data.descripcion,
        webOficial: data.webOficial || undefined,
        ciudad: data.ciudad,
        provincia: data.provincia,
        calle: data.calle,
        cp: data.cp,
        pais: data.pais,
        lat: coordsPreview.lat,
        lng: coordsPreview.lng,
        duracionMinutos: data.duracionMinutos ? parseInt(data.duracionMinutos, 10) : undefined,
        dificultad: data.dificultad,
        creadorId: user.uid,
      });
      router.push(`/sala/${id}`);
    } catch {
      setSubmitError("Error al guardar la sala. Inténtalo de nuevo.");
    }
  }

  const mapsUrl = watch("googleMapsUrl");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/salas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] mb-4">
        <ArrowLeft className="w-4 h-4" />
        Salas
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#334155] mb-6">Nueva sala de escape</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nombre */}
          <Field label="Nombre de la sala" required error={errors.nombreSala?.message}>
            <input {...register("nombreSala")} placeholder="Ej: Sala del Terror" className={inputCls} />
          </Field>

          {/* Google Maps URL */}
          <Field label="Enlace de Google Maps" required error={coordsError ?? errors.googleMapsUrl?.message}>
            <input
              {...register("googleMapsUrl")}
              onBlur={handleMapsUrlBlur}
              placeholder="https://www.google.com/maps/place/..."
              className={`${inputCls} ${coordsError ? "border-red-300 focus:ring-red-400" : coordsPreview ? "border-teal-400" : ""}`}
            />
            {geocoding && (
              <p className="text-xs text-slate-400 mt-1 animate-pulse">Obteniendo dirección...</p>
            )}
            {coordsPreview && !geocoding && (
              <p className="flex items-center gap-1 text-xs text-teal-600 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Coordenadas extraídas: {coordsPreview.lat.toFixed(5)}, {coordsPreview.lng.toFixed(5)}
                <a
                  href={`https://www.google.com/maps?q=${coordsPreview.lat},${coordsPreview.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  Verificar
                </a>
              </p>
            )}
            {!coordsPreview && !coordsError && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Abre el lugar en Google Maps → copia la URL del navegador
              </p>
            )}
          </Field>

          {/* Dirección */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#334155]">Dirección</p>
            <Field label="Calle y número" error={errors.calle?.message}>
              <input {...register("calle")} placeholder="Calle Mayor 12" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" error={errors.ciudad?.message}>
                <input {...register("ciudad")} placeholder="Madrid" className={inputCls} />
              </Field>
              <Field label="Provincia" error={errors.provincia?.message}>
                <input {...register("provincia")} placeholder="Madrid" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código postal" error={errors.cp?.message}>
                <input {...register("cp")} placeholder="28001" className={inputCls} />
              </Field>
              <Field label="País" error={errors.pais?.message}>
                <input {...register("pais")} placeholder="ES" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Duración y dificultad */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (minutos)" error={errors.duracionMinutos?.message}>
              <input
                {...register("duracionMinutos")}
                type="number"
                min={10}
                max={360}
                placeholder="60"
                className={inputCls}
              />
            </Field>
            <Field label="Dificultad" error={errors.dificultad?.message}>
              <select {...register("dificultad")} className={inputCls}>
                <option value="">Sin especificar</option>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
            </Field>
          </div>

          {/* Descripción */}
          <Field label="Descripción" error={errors.descripcion?.message}>
            <textarea
              {...register("descripcion")}
              rows={4}
              placeholder="Describe la sala: temática, número de jugadores recomendado..."
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Web oficial */}
          <Field label="Web oficial" error={errors.webOficial?.message}>
            <input
              {...register("webOficial")}
              type="url"
              placeholder="https://www.escaperoomejemplo.com"
              className={inputCls}
            />
          </Field>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-slate-200 text-[#334155] py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !coordsPreview}
              className="flex-1 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Crear sala"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
