"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, ZoomIn, ZoomOut, RotateCcw, Loader2, X, CheckCircle2 } from "lucide-react";

// Export at 3×
const EXPORT_SCALE = 3;

const DIFICULTAD_COLORS: Record<string, string> = {
  facil: "bg-green-50 text-green-700",
  media: "bg-amber-50 text-amber-700",
  dificil: "bg-red-50 text-red-700",
};
const DIFICULTAD_LABELS: Record<string, string> = {
  facil: "Fácil", media: "Media", dificil: "Difícil",
};

export interface SalaPreviewInfo {
  nombreSala: string;
  ciudad?: string;
  provincia?: string;
  dificultad?: string;
  duracionMinutos?: number;
}

interface Props {
  /** Crop area width in px. Default: 320 */
  cropW?: number;
  /** Crop area height in px. Default: 144 */
  cropH?: number;
  /** "card" shows a sala card preview. "circle" shows circular avatar previews. Default: "card" */
  shape?: "card" | "circle";
  /** Shown in the circle preview below the avatars */
  avatarLabel?: string;
  /** Sala info for card preview */
  salaInfo?: SalaPreviewInfo;
  /** Pre-load existing image */
  currentCardUrl?: string;
  /** Canvas background color before drawing — prevents black on transparent PNGs. Default: "#ffffff" */
  canvasBackground?: string;
  onSave: (cardBlob: Blob, originalBlob: Blob, ext: string) => Promise<void>;
}

export function ImageCropPicker({
  cropW = 320,
  cropH = 144,
  shape = "card",
  avatarLabel,
  salaInfo,
  currentCardUrl,
  canvasBackground = "#ffffff",
  onSave,
}: Props) {
  const CW = cropW;
  const CH = cropH;
  const EXPORT_W = CW * EXPORT_SCALE;
  const EXPORT_H = CH * EXPORT_SCALE;
  // Card preview ratio (80% of crop)
  const PW = Math.round(CW * 0.8);
  const PH = Math.round(CH * 0.8);

  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [imgSrc, setImgSrc] = useState<string | null>(currentCardUrl ?? null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrlSource, setOriginalUrlSource] = useState<string | null>(null);

  const [scale, setScale] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [coverScale, setCoverScale] = useState(1);

  const dragStart = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [urlLoading, setUrlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cropImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  function clampOffset(newDx: number, newDy: number, s: number) {
    const img = cropImgRef.current;
    if (!img || !img.naturalWidth) return { dx: newDx, dy: newDy };
    const maxX = Math.max(0, (img.naturalWidth * s - CW) / 2);
    const maxY = Math.max(0, (img.naturalHeight * s - CH) / 2);
    return {
      dx: Math.max(-maxX, Math.min(maxX, newDx)),
      dy: Math.max(-maxY, Math.min(maxY, newDy)),
    };
  }

  function applyZoom(newScale: number) {
    const clamped = clampOffset(dx, dy, newScale);
    setScale(newScale);
    setDx(clamped.dx);
    setDy(clamped.dy);
  }

  // ── image load ────────────────────────────────────────────────────────────

  function handleImageLoad() {
    const img = cropImgRef.current;
    if (!img || !img.naturalWidth) return;
    const cs = Math.max(CW / img.naturalWidth, CH / img.naturalHeight);
    setCoverScale(cs);
    setScale(cs);
    setDx(0);
    setDy(0);
    setImgLoaded(true);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("El archivo debe ser una imagen."); return; }
    setError(null); setSaved(false); setImgLoaded(false);
    setOriginalFile(file); setOriginalUrlSource(null);
    setImgSrc(URL.createObjectURL(file));
  }

  async function handleUrlLoad() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true); setError(null); setSaved(false); setImgLoaded(false);
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { method: "HEAD" });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) {
        setError("No se pudo cargar la imagen desde esa URL.");
        return;
      }
      setOriginalFile(null); setOriginalUrlSource(url);
      setImgSrc(proxyUrl);
    } catch {
      setError("Error al cargar la imagen. Comprueba la URL.");
    } finally {
      setUrlLoading(false);
    }
  }

  function reset() {
    setImgSrc(null); setImgLoaded(false); setOriginalFile(null);
    setOriginalUrlSource(null); setUrlInput(""); setSaved(false); setError(null);
  }

  // ── drag / zoom ───────────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, dx, dy };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const newDx = dragStart.current.dx + (e.clientX - dragStart.current.x);
    const newDy = dragStart.current.dy + (e.clientY - dragStart.current.y);
    const c = clampOffset(newDx, newDy, scale);
    setDx(c.dx); setDy(c.dy);
  }

  function handlePointerUp() {
    setDragging(false); dragStart.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoom(Math.max(coverScale, Math.min(coverScale * 5, scale * factor)));
  }

  // ── save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const img = cropImgRef.current;
    if (!img || !imgSrc) return;
    setSaving(true); setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_W; canvas.height = EXPORT_H;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = canvasBackground;
      ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

      const visibleW = CW / scale;
      const visibleH = CH / scale;
      const centerX = img.naturalWidth / 2 - dx / scale;
      const centerY = img.naturalHeight / 2 - dy / scale;
      const srcX = Math.max(0, Math.min(img.naturalWidth - visibleW, centerX - visibleW / 2));
      const srcY = Math.max(0, Math.min(img.naturalHeight - visibleH, centerY - visibleH / 2));

      ctx.drawImage(img, srcX, srcY, visibleW, visibleH, 0, 0, EXPORT_W, EXPORT_H);

      const cardBlob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Canvas failed"))), "image/jpeg", 0.85)
      );

      let originalBlob: Blob;
      let ext = "jpg";
      if (originalFile) {
        originalBlob = originalFile;
        const raw = originalFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        ext = ["jpg", "jpeg", "png", "webp"].includes(raw) ? raw.replace("jpeg", "jpg") : "jpg";
      } else {
        const res = await fetch(imgSrc);
        originalBlob = await res.blob();
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("png")) ext = "png";
        else if (ct.includes("webp")) ext = "webp";
      }

      await onSave(cardBlob, originalBlob, ext);
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("Error al guardar la imagen. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // ── derived styles ────────────────────────────────────────────────────────

  const zoomPct = coverScale > 0 ? Math.round((scale / coverScale) * 100) : 100;

  function imgTransform(pr: number) {
    return `translate(calc(-50% + ${dx * pr}px), calc(-50% + ${dy * pr}px)) scale(${scale * pr})`;
  }

  const baseImgStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformOrigin: "center center",
    maxWidth: "none",
    maxHeight: "none",
    pointerEvents: "none",
    userSelect: "none",
  };

  // ── render ────────────────────────────────────────────────────────────────

  const showInputUI = !imgSrc; // hide tabs/input while image is loading or loaded
  const showLoader = !!imgSrc && !imgLoaded;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      {showInputUI && (
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {(["file", "url"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tab === t ? "bg-[#0D9488] text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t === "file" ? <Upload className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
              {t === "file" ? "Subir archivo" : "Pegar URL"}
            </button>
          ))}
        </div>
      )}

      {/* File drop zone */}
      {showInputUI && tab === "file" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
        >
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Haz clic o arrastra una imagen aquí</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* URL input */}
      {showInputUI && tab === "url" && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlLoad()}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleUrlLoad}
            disabled={!urlInput.trim() || urlLoading}
            className="px-4 py-2.5 bg-[#0D9488] text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Loading spinner while image fetches */}
      {showLoader && (
        <div className="text-center py-6 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      )}

      {/* Hidden img — source of truth for naturalWidth/Height and drawImage */}
      {imgSrc && (
        <img
          ref={cropImgRef}
          src={imgSrc}
          alt=""
          onLoad={handleImageLoad}
          onError={() => { setError("No se pudo cargar la imagen."); setImgLoaded(false); setImgSrc(null); }}
          className="hidden"
          draggable={false}
        />
      )}

      {/* Crop tool + preview */}
      {imgLoaded && imgSrc && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ajusta el encuadre</p>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cambiar imagen
            </button>
          </div>

          {/* Crop container */}
          <div className="flex justify-center">
            <div
              style={{ width: CW, height: CH }}
              className={`relative overflow-hidden border border-slate-200 bg-slate-100 select-none touch-none ${
                shape === "circle" ? "rounded-full" : "rounded-xl"
              } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt=""
                style={{ ...baseImgStyle, transform: imgTransform(1) }}
                draggable={false}
              />
              {/* Corner guides — only for card shape */}
              {shape === "card" && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                </div>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => applyZoom(Math.max(coverScale, scale / 1.15))} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range" min={100} max={500} step={1} value={zoomPct}
              onChange={(e) => applyZoom(Math.max(coverScale, Math.min(coverScale * 5, coverScale * parseInt(e.target.value) / 100)))}
              className="w-28 accent-teal-600"
            />
            <button type="button" onClick={() => applyZoom(Math.min(coverScale * 5, scale * 1.15))} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { const c = clampOffset(0, 0, coverScale); setScale(coverScale); setDx(c.dx); setDy(c.dy); }}
              title="Restablecer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-slate-400 w-10 tabular-nums">{zoomPct}%</span>
          </div>
          <p className="text-xs text-slate-400 text-center">Arrastra para mover · Rueda del ratón para zoom</p>

          {/* ── Card preview ──────────────────────────────────────────────── */}
          {shape === "card" && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vista previa de la card</p>
              <div className="inline-block rounded-xl shadow-sm overflow-hidden bg-white border border-slate-100" style={{ width: PW }}>
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-100 to-teal-200" style={{ width: PW, height: PH }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc} alt="" style={{ ...baseImgStyle, transform: imgTransform(PW / CW) }} draggable={false} />
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-semibold text-[#334155] text-xs truncate">{salaInfo?.nombreSala || "Nombre de la sala"}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <span>📍</span>
                    {[salaInfo?.ciudad, salaInfo?.provincia].filter(Boolean).join(", ") || "Sin ubicación"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {salaInfo?.dificultad && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFICULTAD_COLORS[salaInfo.dificultad] ?? "bg-slate-100 text-slate-600"}`}>
                        {DIFICULTAD_LABELS[salaInfo.dificultad] ?? salaInfo.dificultad}
                      </span>
                    )}
                    {salaInfo?.duracionMinutos && (
                      <span className="text-xs text-slate-400">⏱ {salaInfo.duracionMinutos}min</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Circle preview ────────────────────────────────────────────── */}
          {shape === "circle" && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vista previa</p>
              <div className="flex items-center gap-4">
                {/* 80px avatar */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative rounded-full overflow-hidden border-2 border-slate-200 bg-teal-100" style={{ width: 80, height: 80 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt="" style={{ ...baseImgStyle, transform: imgTransform(80 / CW) }} draggable={false} />
                  </div>
                  <span className="text-xs text-slate-400">Perfil</span>
                </div>
                {/* 40px avatar */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative rounded-full overflow-hidden border border-slate-200 bg-teal-100" style={{ width: 40, height: 40 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt="" style={{ ...baseImgStyle, transform: imgTransform(40 / CW) }} draggable={false} />
                  </div>
                  <span className="text-xs text-slate-400">Mini</span>
                </div>
                {avatarLabel && (
                  <div>
                    <p className="text-sm font-semibold text-[#334155]">{avatarLabel}</p>
                    <p className="text-xs text-slate-400">Así te verán los demás</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback + save */}
          {saved && (
            <p className="text-xs text-teal-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {shape === "circle" ? "Foto de perfil guardada" : "Imagen guardada correctamente"}
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-[#0D9488] text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              shape === "circle" ? "Guardar foto de perfil" : "Guardar imagen"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
