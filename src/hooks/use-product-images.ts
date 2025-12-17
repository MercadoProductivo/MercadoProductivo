import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { buildSafeStoragePath } from "@/lib/images";

export type UseProductImagesProps = {
    maxFiles?: number;
};

export function useProductImages({ maxFiles = 5 }: UseProductImagesProps = {}) {
    const supabase = useMemo(() => createClient(), []);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const MAX_SIZE_MB = 5;

    const isFull = files.length >= maxFiles;

    function appendFiles(newFiles: FileList | File[]) {
        if (isFull) return;
        const all = Array.from(newFiles);
        const images = all.filter((f) => f.type.startsWith("image/"));
        if (!images.length) return;

        const tooBig = images.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
        if (tooBig.length) {
            toast.error(`Algunas imágenes superan ${MAX_SIZE_MB}MB y fueron omitidas`);
        }

        const accepted = images.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);

        setFiles((prev) => {
            const remainingSlots = Math.max(0, maxFiles - prev.length);
            const next = [...prev, ...accepted.slice(0, remainingSlots)];
            if (accepted.length > remainingSlots) {
                toast.error(`Máximo ${maxFiles} imágenes por producto`);
            }
            return next;
        });
    }

    function removeFile(index: number) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }

    // Drag handlers
    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        if (isFull) return;
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
        if (isFull) return;
        if (e.dataTransfer?.files?.length) {
            appendFiles(e.dataTransfer.files);
        }
    }

    // Upload Logic
    async function uploadImages(userId: string): Promise<string[]> {
        if (!files.length) return [];
        const bucket = "product-images";
        const urls: string[] = [];

        // Subir secuencial para evitar race conditions o problemas de red masivos
        for (const f of files) {
            const { path } = buildSafeStoragePath({ userId, file: f });
            const { error } = await supabase.storage.from(bucket).upload(path, f, {
                cacheControl: "3600",
                upsert: false,
                contentType: f.type || undefined,
            });

            if (error) {
                throw new Error(`Error subiendo imagen: ${error.message}`);
            }

            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            if (data?.publicUrl) {
                urls.push(data.publicUrl);
            }
        }
        return urls;
    }

    return {
        files,
        isDragging,
        isFull,
        MAX_SIZE_MB,
        appendFiles,
        removeFile,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        uploadImages,
    };
}
