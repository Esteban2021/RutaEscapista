"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CheckCircle2, Loader2, Search, AlertTriangle, PenLine } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { crearSala } from "@/lib/salas";
import { extractCoordsFromGoogleMapsUrl, isGoogleMapsUrl, isShortGoogleMapsUrl } from "@/lib/geocoding";

const schema = z.object({
  nombreSala: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres").trim(),
  descripcion: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  webOficial: z.string().url("URL no válida").optional().or(z.literal("")),
  googleMapsUrl: z.string().optional().or(z.literal("")),
  ciudad: z.string().max(60).optional(),
  provincia: z.string().max(60).optional(),
  calle: z.string().max(100).optional(),
  cp: z.string().max(10).optional(),
  pais: z.string().min(1, "El país es obligatorio"),
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
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

export function CrearSalaScreen() {
  const router = useRouter();
  const { user, perfil } = useAuthStore();

  const [coordsPreview, setCoordsPreview] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [processingUrl, setProcessingUrl] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modo manual
  const [manualMode, setManualMode] = useState(false);
  const [showManualWarning, setShowManualWarning] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualCoordsError, setManualCoordsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pais: "ES" },
    mode: "onChange",
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

  async function processUrl(url: string) {
    url = url.trim();
    setCoordsPreview(null);
    setCoordsError(null);
    if (!url) return;

    if (!isGoogleMapsUrl(url)) {
      setCoordsError("No parece una URL de Google Maps. Copia el enlace desde el navegador o usa 'Compartir → Copiar enlace'.");
      return;
    }

    setProcessingUrl(true);
    try {
      let resolvedUrl = url;
      if (isShortGoogleMapsUrl(url)) {
        const res = await fetch(`/api/expand-url?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.expanded) resolvedUrl = data.expanded;
        else {
          setCoordsError("No se pudo expandir el enlace corto. Inténtalo de nuevo.");
          return;
        }
      }

      const coords = extractCoordsFromGoogleMapsUrl(resolvedUrl);
      if (!coords) {
        setCoordsError("No se pudieron extraer las coordenadas. Asegúrate de que la URL incluya la ubicación exacta.");
        return;
      }
      setCoordsPreview(coords);

      const geoRes = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const a = geoData.address ?? {};
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
      }
    } catch {
      setCoordsError("Error al procesar la URL. Inténtalo de nuevo.");
      setCoordsPreview(null);
    } finally {
      setProcessingUrl(false);
    }
  }

  function handleMapsUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const url = e.clipboardData.getData("text");
    if (url) processUrl(url);
  }

  function handleMapsUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!coordsPreview && !processingUrl) processUrl(e.target.value);
  }

  function handleManualCoords(lat: string, lng: string) {
    setManualCoordsError(null);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      setCoordsPreview({ lat: latNum, lng: lngNum });
    } else {
      setCoordsPreview(null);
    }
  }

  function activateManualMode() {
    setManualMode(true);
    setShowManualWarning(false);
    setCoordsError(null);
  }

  async function onSubmit(data: FormValues) {
    if (!coordsPreview) {
      if (manualMode) setManualCoordsError("Introduce las coordenadas para continuar.");
      else setCoordsError("Las coordenadas son obligatorias.");
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
  const nombreSala = watch("nombreSala");
  const pais = watch("pais");

  // Campos desbloqueados cuando hay coordenadas o estamos en modo manual
  const locked = !coordsPreview && !manualMode;

  // Botón crear habilitado: form válido + coordenadas presentes
  const canSubmit = !isSubmitting && !!coordsPreview && isValid;

  const showValidarBtn = !manualMode && !!mapsUrl && !coordsPreview && !processingUrl;

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

          {/* Google Maps URL — oculto en modo manual */}
          {!manualMode && (
            <Field label="Enlace de Google Maps" required error={coordsError ?? errors.googleMapsUrl?.message}>
              <div className="flex gap-2">
                <input
                  {...register("googleMapsUrl")}
                  onPaste={handleMapsUrlPaste}
                  onBlur={handleMapsUrlBlur}
                  placeholder="https://www.google.com/maps/place/..."
                  className={`${inputCls} ${coordsError ? "border-red-300 focus:ring-red-400" : coordsPreview ? "border-teal-400" : ""}`}
                />
                {(showValidarBtn || processingUrl) && (
                  <button
                    type="button"
                    onClick={() => processUrl(mapsUrl ?? "")}
                    disabled={processingUrl}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-[#0D9488] hover:bg-teal-50 transition-colors disabled:opacity-50"
                  >
                    {processingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {processingUrl ? "..." : "Validar"}
                  </button>
                )}
              </div>

              {processingUrl && (
                <p className="text-xs text-slate-400 mt-1 animate-pulse">Obteniendo dirección...</p>
              )}
              {coordsPreview && !processingUrl && (
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
              {!coordsPreview && !coordsError && !processingUrl && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Pega el enlace de Google Maps para continuar
                </p>
              )}

              {/* Botón / aviso de modo manual */}
              {!coordsPreview && !processingUrl && (
                <div className="mt-3">
                  {!showManualWarning ? (
                    <button
                      type="button"
                      onClick={() => setShowManualWarning(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Introducir manualmente
                    </button>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Las coordenadas son obligatorias</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Sin coordenadas la sala no aparecerá en el mapa ni podrá usarse en rutas.
                            Si continúas deberás introducirlas a mano (latitud y longitud).
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowManualWarning(false)}
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors font-medium"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={activateManualMode}
                          className="flex-1 text-xs px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium"
                        >
                          Continuar manualmente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Field>
          )}

          {/* Coordenadas manuales */}
          {manualMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#334155]">Coordenadas <span className="text-red-500">*</span></p>
                <button
                  type="button"
                  onClick={() => { setManualMode(false); setCoordsPreview(null); setManualLat(""); setManualLng(""); }}
                  className="text-xs text-[#0D9488] hover:underline"
                >
                  Usar enlace de Google Maps
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud" required error={undefined}>
                  <input
                    value={manualLat}
                    onChange={(e) => { setManualLat(e.target.value); handleManualCoords(e.target.value, manualLng); }}
                    placeholder="40.41650"
                    className={`${inputCls} ${coordsPreview ? "border-teal-400" : ""}`}
                  />
                </Field>
                <Field label="Longitud" required error={undefined}>
                  <input
                    value={manualLng}
                    onChange={(e) => { setManualLng(e.target.value); handleManualCoords(manualLat, e.target.value); }}
                    placeholder="-3.70379"
                    className={`${inputCls} ${coordsPreview ? "border-teal-400" : ""}`}
                  />
                </Field>
              </div>
              {manualCoordsError && <p className="text-xs text-red-500">{manualCoordsError}</p>}
              {coordsPreview && (
                <p className="flex items-center gap-1 text-xs text-teal-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Coordenadas válidas: {coordsPreview.lat.toFixed(5)}, {coordsPreview.lng.toFixed(5)}
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
            </div>
          )}

          {/* Dirección */}
          <div className={`space-y-3 transition-opacity ${locked ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-sm font-medium text-[#334155]">
              Dirección
              {locked && <span className="text-xs text-slate-400 font-normal ml-2">(se rellena automáticamente)</span>}
            </p>
            <Field label="Calle y número" error={errors.calle?.message}>
              <input {...register("calle")} disabled={locked} placeholder="Calle Mayor 12" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" error={errors.ciudad?.message}>
                <input {...register("ciudad")} disabled={locked} placeholder="Madrid" className={inputCls} />
              </Field>
              <Field label="Provincia" error={errors.provincia?.message}>
                <input {...register("provincia")} disabled={locked} placeholder="Madrid" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código postal" error={errors.cp?.message}>
                <input {...register("cp")} disabled={locked} placeholder="28001" className={inputCls} />
              </Field>
              <Field label="País" required error={errors.pais?.message}>
                <input {...register("pais")} disabled={locked} placeholder="ES" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Duración y dificultad */}
          <div className={`grid grid-cols-2 gap-3 transition-opacity ${locked ? "opacity-40 pointer-events-none" : ""}`}>
            <Field label="Duración (minutos)" error={errors.duracionMinutos?.message}>
              <input
                {...register("duracionMinutos")}
                disabled={locked}
                type="number"
                min={10}
                max={360}
                placeholder="60"
                className={inputCls}
              />
            </Field>
            <Field label="Dificultad" error={errors.dificultad?.message}>
              <select {...register("dificultad")} disabled={locked} className={inputCls}>
                <option value="">Sin especificar</option>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
            </Field>
          </div>

          {/* Descripción */}
          <div className={`transition-opacity ${locked ? "opacity-40 pointer-events-none" : ""}`}>
            <Field label="Descripción" error={errors.descripcion?.message}>
              <textarea
                {...register("descripcion")}
                disabled={locked}
                rows={4}
                placeholder="Describe la sala: temática, número de jugadores recomendado..."
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>

          {/* Web oficial */}
          <div className={`transition-opacity ${locked ? "opacity-40 pointer-events-none" : ""}`}>
            <Field label="Web oficial" error={errors.webOficial?.message}>
              <input
                {...register("webOficial")}
                disabled={locked}
                type="url"
                placeholder="https://www.escaperoomejemplo.com"
                className={inputCls}
              />
            </Field>
          </div>

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
              disabled={!canSubmit}
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
