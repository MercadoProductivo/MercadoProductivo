export function mimeToExt(mime?: string, fallbackName?: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  if (mime && map[mime]) return map[mime];
  if (fallbackName) {
    const m = fallbackName.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    if (m) return m[1];
  }
  return "jpg"; // default razonable
}

export function buildSafeStoragePath(opts: {
  userId: string;
  productId?: string;
  file: File;
}): { path: string; name: string } {
  const ext = mimeToExt(opts.file.type, opts.file.name);
  // Evitamos usar el nombre original para prevenir caracteres problemáticos
  const base = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const name = `${base}.${ext}`;
  const path = opts.productId
    ? `${opts.userId}/${opts.productId}/${name}`
    : `${opts.userId}/${name}`;
  return { path, name };
}

export function pathFromPublicUrl(url: string): string | null {
  // Soporta distintos patrones de URL pública de Supabase y cualquier bucket
  const markers = [
    "/storage/v1/object/public/", // actual
    "/object/public/",            // legado
    "/render/image/public/",      // endpoint de render
  ];
  let after = "";
  for (const m of markers) {
    const idx = url.indexOf(m);
    if (idx !== -1) {
      after = url.slice(idx + m.length);
      break;
    }
  }
  if (!after) return null;
  // Remover posibles querystrings
  const withoutQs = after.split("?")[0];
  // Estructura esperada: "<bucket>/<object-path>"
  const firstSlash = withoutQs.indexOf("/");
  if (firstSlash === -1) return null;
  const encoded = withoutQs.slice(firstSlash + 1);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded; // fallback
  }
}

export function getPublicUrlForPath(supabase: any, bucket: string, path: string): string | null {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
