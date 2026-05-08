"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

type ResourceType = "image" | "video" | "raw";

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  resourceType: ResourceType;
  signature: string;
  type: "upload" | "authenticated";
};

export type UploadResult = {
  publicId: string;
  url: string;
  bytes?: number;
  format?: string;
};

type Props = {
  folder: "ntp/images/covers" | "ntp/audio/public" | "ntp/audio/vault";
  resourceType: ResourceType;
  accept: string;
  label: string;
  helpText?: string;
  vault?: boolean;
  currentPublicId?: string | null;
  currentUrl?: string | null;
  onUploaded: (result: UploadResult) => void;
  onClear?: () => void;
};

export function CloudinaryUploader({
  folder,
  resourceType,
  accept,
  label,
  helpText,
  vault = false,
  currentPublicId,
  currentUrl,
  onUploaded,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (file: File) => {
    setError(null);
    setProgress(0);
    try {
      const signRes = await fetch("/api/admin/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, resourceType }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => ({}));
        setError(body.error ?? "Could not get upload signature.");
        setProgress(null);
        return;
      }
      const sign = (await signRes.json()) as SignResponse;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sign.apiKey);
      fd.append("timestamp", String(sign.timestamp));
      fd.append("signature", sign.signature);
      fd.append("folder", sign.folder);
      if (sign.type === "authenticated") fd.append("type", "authenticated");

      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;
      xhr.open("POST", url);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as {
              public_id: string;
              secure_url: string;
              bytes?: number;
              format?: string;
            };
            // Strip the folder prefix so we save just the publicId tail.
            const tail = json.public_id.startsWith(`${sign.folder}/`)
              ? json.public_id.slice(sign.folder.length + 1)
              : json.public_id;
            onUploaded({
              publicId: tail,
              url: json.secure_url,
              bytes: json.bytes,
              format: json.format,
            });
            setProgress(null);
          } catch {
            setError("Upload succeeded but response was malformed.");
            setProgress(null);
          }
        } else {
          setError(`Upload failed (${xhr.status}).`);
          setProgress(null);
        }
      });
      xhr.addEventListener("error", () => {
        setError("Upload network error.");
        setProgress(null);
      });
      xhr.send(fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setProgress(null);
    }
  };

  const hasFile = !!(currentPublicId || currentUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="block text-sm text-white/70">
          {label}
          {vault ? (
            <span className="ml-2 rounded-full bg-[#EB41DF]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EB41DF]">
              Vault
            </span>
          ) : null}
        </span>
        {hasFile && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-white/50 hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="flex items-center gap-2 rounded border border-white/20 bg-black/30 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          <Upload size={14} />
          {progress !== null ? `Uploading… ${progress}%` : hasFile ? "Replace" : "Choose file"}
        </button>
        {hasFile ? (
          <span className="truncate text-xs text-white/60">
            {currentPublicId ?? currentUrl}
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePick(f);
          e.target.value = "";
        }}
      />

      {helpText && progress === null && !error ? (
        <p className="text-[11px] text-white/40">{helpText}</p>
      ) : null}
      {error ? (
        <div className="flex items-center gap-1 text-xs text-red-300">
          <X size={12} />
          {error}
        </div>
      ) : null}
    </div>
  );
}
