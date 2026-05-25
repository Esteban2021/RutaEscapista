"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, CheckCircle2, Loader2, Search,
  AlertTriangle, PenLine, RotateCcw,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getSala, updateSala } from "@/lib/salas";
import { uploadSalaImage } from "@/lib/storage";
import { ImageCropPicker } from "@/components/ui/ImageCropPicker";
import {
  extractCoordsFromGoogleMapsUrl, isGoogleMapsUrl, isShortGoogleMapsUrl,
  isPlusCode, isShortPlusCode, decodePlusCode, recoverPlusCode, parsePlusCodeInput,
} from "@/lib/geocoding";
import type { Sala } from "@/types";

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
  estado: z.enum(["activa", "cerrada", "archivada"]),
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

function EditarSalaForm({ sala, salaId }: { sala: Sala; salaId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [coordsPreview, setCoordsPreview] = useState<{ lat: number; lng: number } | null>(
    sala.coordenadas ? { lat: sala.coordenadas.lat, lng: sala.coordenadas.lng } : null
  );
  const [coordsSource, setCoordsSource] = useState<"maps" | "pluscode" | "manual" | null>(
    sala.coordenadas ? "manual" : null
  );
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [processingUrl, setProcessingUrl] = useState(false);
  const [plusCode, setPlusCode] = useState("");
  const [plusCodeError, setPlusCodeError] = useState<string | null>(null);
  const [processingPlusCode, setProcessingPlusCode] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreSala: sala.nombreSala,
      descripcion: sala.descripcion ?? "",
      webOficial: sala.webOficial ?? "",
      googleMapsUrl: "",
      calle: sala.direccion?.calle ?? "",
      ciudad: sala.direccion?.ciudad ?? "",
      provincia: sala.direccion?.provincia ?? "",
      cp: sala.direccion?.cp ?? "",
      pais: sala.direccion?.pais ?? "ES",
      duracionMinutos: sala.duracionMinutos?.toString() ?? "",
      dificultad: sala.dificultad,
      estado: sala.estado ?? "activa",
    },
  });

  async function fillAddressFromCoords(lat: number, lng: number) {
    try {
      const geoRes = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (!geoRes.ok) return;
      const geoData = await geoRes.json();
      const a = geoData.address ?? {};
      const calle = [a.road, a.house_number].filter(Boolean).join(" ");
      const ciudad = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
      const provincia = a.province ?? a.county ?? a.state_district ?? a.state ?? "";
      const cp = a.postcode ?? "";
      const pais = a.country ?? (a.country_code ? a.country_code.toUpperCase() : "ES");
      if (calle) setValue("calle", calle, { shouldValidate: false });
      if (ciudad) setValue("ciudad", ciudad, { shouldValidate: false });
      if (provincia) setValue("provincia", provincia, { shouldValidate: false });
      if (cp) setValue("cp", cp, { shouldValidate: false });
      setValue("pais", pais, { shouldValidate: false });
    } catch { /* opcional */ }
  }

  async function processUrl(url: string) {
    url = url.trim();
    setCoordsPreview(null);
    setCoordsSource(null);
    setMapsError(null);
    if (!url) return;

    if (!isGoogleMapsUrl(url)) {
      setMapsError("No parece una URL de Google Maps. Usa 'Compartir → Copiar enlace'.");
      return;
    }

    setProcessingUrl(true);
    try {
      let resolvedUrl = url;
      if (isShortGoogleMapsUrl(url)) {
        const res = await fetch(`/api/expand-url?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.expanded) resolvedUrl = data.expanded;
        else { setMapsError("No se pudo expandir el enlace corto. Inténtalo de nuevo."); return; }
      }
      const coords = extractCoordsFromGoogleMapsUrl(resolvedUrl);
      if (!coords) {
        setMapsError("No se pudieron extraer las coordenadas. Asegúrate de pegar la URL del navegador.");
        return;
      }
      setCoordsPreview(coords);
      setCoordsSource("maps");
      fillAddressFromCoords(coords.lat, coords.lng);
    } catch {
      setMapsError("Error al procesar la URL. Inténtalo de nuevo.");
    } finally {
      setProcessingUrl(false);
    }
  }

  async function resolveLocationText(value: string) {
    setPlusCodeError(null);
    if (coordsSource === "pluscode") { setCoordsPreview(null); setCoordsSource(null); }
    if (!value.trim()) return;

    if (isPlusCode(value)) {
      const { code, place } = parsePlusCodeInput(value);
      if (!isShortPlusCode(value)) {
        const coords = decodePlusCode(code);
        if (coords) { setCoordsPreview(coords); setCoordsSource("pluscode"); fillAddressFromCoords(coords.lat, coords.lng); }
        return;
      }
      if (!place) {
        setPlusCodeError("Añade el nombre de la ciudad después del código. Ej: J4XP+86 Tàrrega");
        return;
      }
      setProcessingPlusCode(true);
      try {
        const res = await fetch(`/api/geocode-place?q=${encodeURIComponent(place)}`);
        if (!res.ok) { setPlusCodeError(`No se encontró "${place}". Prueba con otro nombre.`); return; }
        const { lat, lng } = await res.json();
        const coords = recoverPlusCode(code, lat, lng);
        if (coords) { setCoordsPreview(coords); setCoordsSource("pluscode"); fillAddressFromCoords(coords.lat, coords.lng); }
      } catch {
        setPlusCodeError("Error al resolver el código corto. Inténtalo de nuevo.");
      } finally {
        setProcessingPlusCode(false);
      }
      return;
    }

    if (value.trim().length < 5) return;
    setProcessingPlusCode(true);
    try {
      const res = await fetch(`/api/geocode-place?q=${encodeURIComponent(value)}`);
      if (!res.ok) { setPlusCodeError("No se encontró esa dirección. Revisa el texto o usa otro método."); return; }
      const { lat, lng } = await res.json();
      setCoordsPreview({ lat, lng });
      setCoordsSource("pluscode");
      fillAddressFromCoords(lat, lng);
    } catch {
      setPlusCodeError("Error al buscar la dirección. Inténtalo de nuevo.");
    } finally {
      setProcessingPlusCode(false);
    }
  }

  function handlePlusCodeChange(value: string) {
    setPlusCode(value);
    setPlusCodeError(null);
    if (coordsSource === "pluscode") { setCoordsPreview(null); setCoordsSource(null); }
    if (isPlusCode(value) && !isShortPlusCode(value)) resolveLocationText(value);
  }

  function resetLocation() {
    setCoordsPreview(null);
    setCoordsSource(null);
    setMapsError(null);
    setPlusCodeError(null);
    setPlusCode("");
    setValue("googleMapsUrl", "");
  }

  function handleManualCoords(lat: string, lng: string) {
    setManualCoordsError(null);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      setCoordsPreview({ lat: latNum, lng: lngNum });
      setCoordsSource("manual");
    } else {
      setCoordsPreview(null);
      setCoordsSource(null);
    }
  }

  async function handleImageSave(cardBlob: Blob, originalBlob: Blob, ext: string) {
    const [cardUrl, originalUrl] = await Promise.all([
      uploadSalaImage(salaId, "card", cardBlob, "jpg"),
      uploadSalaImage(salaId, "original", originalBlob, ext),
    ]);
    await updateSala(salaId, { imagenUrl: cardUrl, imagenOriginalUrl: originalUrl });
    queryClient.invalidateQueries({ queryKey: ["sala", salaId] });
  }

  async function onSubmit(data: FormValues) {
    if (!coordsPreview) {
      if (manualMode) setManualCoordsError("Introduce las coordenadas para continuar.");
      else setMapsError("Las coordenadas son obligatorias.");
      return;
    }
    setSubmitError(null);
    try {
      await updateSala(salaId, {
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
        duracionMinutos: data.duracionMinutos ? parseInt(data.duracionMinutos, 10) : null,
        dificultad: data.dificultad ?? null,
        estado: data.estado,
      });
      router.push(`/sala/${salaId}`);
    } catch {
      setSubmitError("Error al guardar los cambios. Inténtalo de nuevo.");
    }
  }

  const mapsUrl = watch("googleMapsUrl");
  const nombreSala = watch("nombreSala");
  const locked = !coordsPreview && !manualMode;
  const canSubmit = !isSubmitting && !!coordsPreview && (nombreSala?.trim().length ?? 0) >= 2;
  const mapsDisabled = coordsSource === "pluscode";
  const plusCodeDisabled = coordsSource === "maps";
  const showValidarBtn = !mapsDisabled && !!mapsUrl && !coordsPreview && !processingUrl;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href={`/sala/${salaId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] mb-4">
        <ArrowLeft className="w-4 h-4" />
        Volver a la sala
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#334155] mb-6">Editar sala</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nombre */}
          <Field label="Nombre de la sala" required error={errors.nombreSala?.message}>
            <input {...register("nombreSala")} placeholder="Ej: Sala del Terror" className={inputCls} />
          </Field>

          {/* Ubicación */}
          {!manualMode && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-4">
              <p className="text-sm font-medium text-[#334155]">
                Ubicación <span className="text-red-500">*</span>
              </p>

              {/* Coordenadas confirmadas */}
              {coordsPreview && (
                <div className="flex items-center justify-between bg-teal-50 rounded-xl px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {coordsPreview.lat.toFixed(5)}, {coordsPreview.lng.toFixed(5)}
                    <a
                      href={`https://www.google.com/maps?q=${coordsPreview.lat},${coordsPreview.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline ml-1"
                    >
                      Verificar
                    </a>
                  </p>
                  <button
                    type="button"
                    onClick={resetLocation}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Cambiar
                  </button>
                </div>
              )}

              {/* Picker: solo cuando no hay coords */}
              {!coordsPreview && (
                <>
                  {/* Opción A: Plus Code o dirección */}
                  <div className={`space-y-2 transition-opacity ${plusCodeDisabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Plus Code o dirección</p>
                    <div className="relative flex gap-2">
                      <input
                        value={plusCode}
                        onChange={(e) => handlePlusCodeChange(e.target.value)}
                        onBlur={(e) => { if (!coordsPreview && !processingPlusCode) resolveLocationText(e.target.value); }}
                        disabled={plusCodeDisabled}
                        placeholder="Ej: 8FVC9G8F+6W · J4XP+86 Tàrrega · Carrer de Sant Eloi 18, Tàrrega"
                        className={`${inputCls} ${plusCodeError ? "border-red-300 focus:ring-red-400" : ""}`}
                      />
                      {(!!plusCode && !coordsPreview && !processingPlusCode) && (
                        <button
                          type="button"
                          onClick={() => resolveLocationText(plusCode)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-[#0D9488] hover:bg-teal-50 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                          Buscar
                        </button>
                      )}
                      {processingPlusCode && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    {plusCodeError && <p className="text-xs text-red-500">{plusCodeError}</p>}
                    {!plusCodeError && !processingPlusCode && (
                      <p className="text-xs text-slate-400">Plus Code completo, código corto con ciudad, o dirección completa</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <hr className="flex-1 border-slate-200" />
                    <span className="text-xs text-blue-500 font-medium">o</span>
                    <hr className="flex-1 border-slate-200" />
                  </div>

                  {/* Opción B: Google Maps */}
                  <div className={`space-y-2 transition-opacity ${mapsDisabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Enlace de Google Maps</p>
                    <div className="flex gap-2">
                      <input
                        {...register("googleMapsUrl")}
                        onPaste={(e) => { const url = e.clipboardData.getData("text"); if (url) processUrl(url); }}
                        onBlur={(e) => { if (!coordsPreview && !processingUrl) processUrl(e.target.value); }}
                        disabled={mapsDisabled}
                        placeholder="https://www.google.com/maps/place/..."
                        className={`${inputCls} ${mapsError ? "border-red-300 focus:ring-red-400" : ""}`}
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
                    {mapsError && <p className="text-xs text-red-500">{mapsError}</p>}
                    {!mapsError && !processingUrl && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Pega el enlace del navegador o usa &ldquo;Compartir → Copiar enlace&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Intro manual */}
                  <div>
                    {!showManualWarning ? (
                      <button
                        type="button"
                        onClick={() => setShowManualWarning(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        Introducir coordenadas manualmente
                      </button>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Las coordenadas son obligatorias</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Sin coordenadas la sala no aparecerá en el mapa ni podrá usarse en rutas.
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
                            onClick={() => { setManualMode(true); setShowManualWarning(false); }}
                            className="flex-1 text-xs px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium"
                          >
                            Continuar manualmente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Coordenadas manuales */}
          {manualMode && (
            <div className="border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#334155]">
                  Coordenadas manuales <span className="text-red-500">*</span>
                </p>
                <button
                  type="button"
                  onClick={() => { setManualMode(false); setCoordsPreview(null); setCoordsSource(null); setManualLat(""); setManualLng(""); }}
                  className="text-xs text-[#0D9488] hover:underline"
                >
                  Usar Google Maps o Plus Code
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud" required>
                  <input
                    value={manualLat}
                    onChange={(e) => { setManualLat(e.target.value); handleManualCoords(e.target.value, manualLng); }}
                    placeholder="40.41650"
                    className={`${inputCls} ${coordsSource === "manual" ? "border-teal-400" : ""}`}
                  />
                </Field>
                <Field label="Longitud" required>
                  <input
                    value={manualLng}
                    onChange={(e) => { setManualLng(e.target.value); handleManualCoords(manualLat, e.target.value); }}
                    placeholder="-3.70379"
                    className={`${inputCls} ${coordsSource === "manual" ? "border-teal-400" : ""}`}
                  />
                </Field>
              </div>
              {manualCoordsError && <p className="text-xs text-red-500">{manualCoordsError}</p>}
              {coordsPreview && coordsSource === "manual" && (
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
            <p className="text-sm font-medium text-[#334155]">Dirección</p>
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

          {/* Imagen de portada */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-[#334155]">Imagen de portada</p>
            <ImageCropPicker
              salaInfo={{
                nombreSala: watch("nombreSala") || sala.nombreSala,
                ciudad: watch("ciudad") || sala.direccion?.ciudad,
                provincia: watch("provincia") || sala.direccion?.provincia,
                dificultad: watch("dificultad") || sala.dificultad,
                duracionMinutos: sala.duracionMinutos,
              }}
              currentCardUrl={sala.imagenUrl}
              onSave={handleImageSave}
            />
          </div>

          {/* Estado */}
          <Field label="Estado" error={errors.estado?.message}>
            <select {...register("estado")} className={inputCls}>
              <option value="activa">Activa</option>
              <option value="cerrada">Cerrada</option>
              <option value="archivada">Archivada</option>
            </select>
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
              disabled={!canSubmit}
              className="flex-1 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditarSalaScreen({ salaId }: { salaId: string }) {
  const { perfil } = useAuthStore();

  const { data: sala, isLoading } = useQuery({
    queryKey: ["sala", salaId],
    queryFn: () => getSala(salaId),
  });

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Solo los administradores pueden editar salas</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-10 w-32 bg-white rounded-xl animate-pulse" />
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!sala) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">Sala no encontrada</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  return <EditarSalaForm sala={sala} salaId={salaId} />;
}
