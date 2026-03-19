import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaStop } from "react-icons/fa";
import { toaster } from "../components/ui/toaster";
import { Button } from "@chakra-ui/react";

type Props = {
  uploadUrl: string;
  onResult?: (r: { text: string; audioUrl?: string; durationSec?: number }) => void;
  onTranscribeStart?: () => void;
  onTranscribeEnd?: () => void;
  disabled?: boolean;
};

export default function RecorderButton({
    uploadUrl,
    onResult,
    onTranscribeStart,
    onTranscribeEnd,
    disabled,
    }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tStartRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  // Para limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      console.log("[recorder] unmount → deteniendo y liberando stream");
      try { mediaRecorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  const initRecorder = async () => {
    if (mediaRecorderRef.current) return true;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("[recorder] navigator.mediaDevices.getUserMedia no disponible");
      toaster.create({ title: "🎤 Micrófono no disponible", description: "Este navegador no soporta grabación.", closable: true });
      return false;
    }
    console.log("[recorder] solicitando permisos de micrófono…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Elegir MIME soportado (Safari no soporta webm)
      let mimeType = "";
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4" // fallback para Safari/iOS
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
      }
      if (!mimeType) {
        console.warn("[recorder] ningún MIME soportado por MediaRecorder; usando por defecto");
      } else {
        console.log("[recorder] MIME elegido:", mimeType);
      }
      mimeTypeRef.current = mimeType || "audio/webm";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mr.onstart = () => {
        tStartRef.current = performance.now();
        console.log("[recorder] onstart", { state: mr.state });
      };

      mr.ondataavailable = (e) => {
        console.log("[recorder] ondataavailable", { size: e.data?.size });
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onerror = (e: any) => {
        console.error("[recorder] onerror", e?.error || e);
        toaster.create({ title: "🎤 Error de grabación", description: String(e?.error || e), closable: true });
      };

      mr.onstop = async () => {
        const tStop = performance.now();
        const durationSec = tStartRef.current ? (tStop - tStartRef.current) / 1000 : undefined;
        console.log("[recorder] onstop", { state: mr.state, chunks: chunksRef.current.length, durationSec });

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];

        console.log("[recorder] blob creado", { size: blob.size, type: blob.type });
        const audioUrl = URL.createObjectURL(blob);
        onTranscribeStart?.();
        setBusy(true);
        toaster.create({ title: "Procesando audio…", description: "Subiendo al servidor..." , closable: true});

        try {
          const tUp0 = performance.now();
          const form = new FormData();
          // El nombre de campo debe coincidir con tu backend ("audio")
          form.append("audio", blob, `recording.${blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm"}`);

          console.log("[recorder] POST", { uploadUrl, method: "POST" });

          const res = await fetch(uploadUrl, { method: "POST", body: form });

          console.log("[recorder] respuesta HTTP", { status: res.status });
          // Diagnóstico de errores comunes
          if (!res.ok) {
            let text = "";
            try { text = await res.text(); } catch {}
            console.error("[recorder] POST no OK", { status: res.status, body: text?.slice(0, 2000) });
            // 413: payload muy grande, 415: tipo no soportado, 500: error servidor
            toaster.create({
              title: `❌ Error del servidor (${res.status})`,
              description: text ? text.slice(0, 140) : "Ver consola para más detalles.",
              closable: true
            });
            return;
          }

          // Intenta parsear JSON; si falla, muestra el texto crudo
          let data: any = null;
          const raw = await res.text();
          try {
            data = JSON.parse(raw);
          } catch (_e) {
            console.error("[recorder] JSON.parse falló; raw=", raw.slice(0, 2000));
            toaster.create({ title: "❌ Respuesta inválida", description: "El servidor no devolvió JSON válido.", closable: true });
            return;
          }

          const tUp1 = performance.now();
          console.log("[recorder] upload+parse OK", { ms: Math.round(tUp1 - tUp0), dataKeys: Object.keys(data || {}) });

          // Validar forma esperada
          if (!data || typeof data.text !== "string") {
            console.warn("[recorder] payload inesperado", data);
          }

          // Llamar callback con info útil
          onResult?.({
            text: data?.text ?? "",
            audioUrl,
            durationSec
          });

          toaster.create({ title: "✅ Transcripción completada", description: "Texto insertado.", closable: true });
        } catch (err: any) {
          console.error("[recorder] error en fetch/post", err);
          toaster.create({ title: "❌ Error al transcribir", description: "Revisa la conexión con el servidor.", closable: true });
        } finally {
          setBusy(false);
          onTranscribeEnd?.();
          // Libera el objeto URL (si no lo usas en UI)
          setTimeout(() => URL.revokeObjectURL(audioUrl), 30000);
        }
      };

      mediaRecorderRef.current = mr;
      console.log("[recorder] MediaRecorder listo");
      return true;
    } catch (e: any) {
      console.error("[recorder] getUserMedia/MediaRecorder fallo", e);
      toaster.create({ title: "🎤 Micrófono no accesible", description: "Revisa los permisos del navegador.", closable: true });
      return false;
    }
  };

  // Iniciar / detener grabación
  const toggleRecording = async () => {
    if (busy) {
      console.warn("[recorder] ocupado, cancela toggle");
      return;
    }
    try {
      if (!recording) {
        const ok = await initRecorder();
        if (!ok) return;
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        console.log("[recorder] start()");
        mr.start();
        setRecording(true);
        toaster.create({ title: "🎙️ Grabando…", description: "Pulsa nuevamente para detener.", closable: true});
      } else {
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        console.log("[recorder] stop()");
        mr.stop();
        setRecording(false);
        // opcional: detener las pistas para liberar el micrófono
        //streamRef.current?.getTracks().forEach(tr => tr.stop());
      }
    } catch (e) {
      console.error("[recorder] toggleRecording error", e);
      toaster.create({ title: "❌ Error al grabar", description: String(e), closable: true});
    }
  };

  return (
    <Button
      onClick={toggleRecording}
      borderRadius="full"
      size="md"
      bg={recording ? "red.500" : "#4CE07E"}
      color="white"
      minW="44px"
      h="44px"
      boxShadow="0 3px 8px rgba(76,224,126,0.25)"
      _hover={{ transform: "scale(1.05)", bg: recording ? "red.600" : "#3dd472" }}
      _active={{ transform: "scale(0.97)" }}
      disabled={busy || disabled}
      title={busy ? "Procesando…" : recording ? "Detener" : "Grabar"}
    >
      {recording ? <FaStop size={16} /> : <FaMicrophone size={16} />}
    </Button>
  );
}