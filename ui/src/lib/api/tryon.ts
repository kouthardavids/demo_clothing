import { getProduct } from "./products";
import type { FaceRect } from "../detectFace";

const API_URL: string =
    (import.meta as any).env?.VITE_API_URL;

export const MAX_CLOTHES = 4;

const MAX_UPLOAD_SIZE = 3.5 * 1024 * 1024;

type CompressionSettings = {
    maxDimension: number;
    quality: number;
    mimeType: "image/jpeg" | "image/webp";
};

const compressImage = async (
    src: string,
    settings: CompressionSettings
): Promise<Blob> => {
    const res = await fetch(src);

    if (!res.ok) {
        throw new Error("Could not load an image.");
    }

    const originalBlob = await res.blob();
    const bitmap = await createImageBitmap(originalBlob);

    const scale = Math.min(
        1,
        settings.maxDimension / Math.max(bitmap.width, bitmap.height)
    );

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
        bitmap.close();
        throw new Error("Could not process an image.");
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Image compression failed."));
                }
            },
            settings.mimeType,
            settings.quality
        );
    });

    if (compressed.type !== settings.mimeType) {
        throw new Error(
            "Your browser does not support the required image format."
        );
    }

    return compressed;
};

export type TryOnInput = {
    bodyDataUrl: string;
    itemIds: number[];
    faceRect?: FaceRect | null;
};

export async function generateLook({
    bodyDataUrl,
    itemIds,
    faceRect,
}: TryOnInput): Promise<string> {
    const products = itemIds
        .map(getProduct)
        .filter(
            (p): p is NonNullable<ReturnType<typeof getProduct>> => !!p
        );

    if (products.length === 0) {
        throw new Error("Select at least one piece.");
    }

    if (products.length > MAX_CLOTHES) {
        throw new Error(`Pick at most ${MAX_CLOTHES} pieces at a time.`);
    }

    // Try progressively stronger compression if necessary.
    const compressionLevels = [
        { person: 1600, clothes: 1200, quality: 0.82 },
        { person: 1400, clothes: 1000, quality: 0.75 },
        { person: 1200, clothes: 850, quality: 0.68 },
    ];

    let personBlob: Blob | null = null;
    let clothesBlobs: Blob[] = [];
    let totalSize = 0;

    for (const level of compressionLevels) {
        personBlob = await compressImage(bodyDataUrl, {
            maxDimension: level.person,
            quality: level.quality,
            mimeType: "image/jpeg",
        });

        clothesBlobs = await Promise.all(
            products.map((product) =>
                compressImage(product.image, {
                    maxDimension: level.clothes,
                    quality: level.quality,
                    mimeType: "image/webp",
                })
            )
        );

        totalSize =
            personBlob.size +
            clothesBlobs.reduce((total, blob) => total + blob.size, 0);

        if (totalSize <= MAX_UPLOAD_SIZE) {
            break;
        }
    }

    if (!personBlob || totalSize > MAX_UPLOAD_SIZE) {
        throw new Error(
            "Your images are too large to upload. Please use smaller images."
        );
    }

    const form = new FormData();

    form.append("person", personBlob, "body.jpg");

    clothesBlobs.forEach((blob, index) => {
        form.append("clothes", blob, `item-${products[index].id}.webp`);
    });

    if (faceRect) {
        form.append("faceRect", JSON.stringify(faceRect));
    }

    form.append(
        "labels",
        JSON.stringify(products.map((product) => product.label))
    );

    const res = await fetch(`${API_URL}/api/tryon`, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        let message = "Could not generate your look. Please try again.";

        try {
            const data = await res.json();

            if (data?.error) {
                message = data.error;
            }
        } catch {
            // Keep the default message.
        }

        throw new Error(message);
    }

    const blob = await res.blob();

    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(blob);
    });
}