import { getProduct } from "./products";
import type { FaceRect } from "./detectFace";

const API_URL: string = (import.meta as any).env?.VITE_API_URL;
export const MAX_CLOTHES = 4;

const toBlob = async (src: string): Promise<Blob> => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Could not load image ${src}`);
    return res.blob();
};

export type TryOnInput = {
    bodyDataUrl: string;
    itemIds: number[];
    faceRect?: FaceRect | null;
};

export async function generateLook({ bodyDataUrl, itemIds, faceRect }: TryOnInput): Promise<string> {
    const products = itemIds.map(getProduct).filter((p): p is NonNullable<ReturnType<typeof getProduct>> => !!p);
    if (products.length === 0) throw new Error("Select at least one piece.");
    if (products.length > MAX_CLOTHES) throw new Error(`Pick at most ${MAX_CLOTHES} pieces at a time.`);

    const form = new FormData();
    form.append("person", await toBlob(bodyDataUrl), "body.jpg");

    const blobs = await Promise.all(products.map((p) => toBlob(p.image)));
    blobs.forEach((blob, i) => form.append("clothes", blob, `item-${products[i].id}.png`));
    if (faceRect) form.append("faceRect", JSON.stringify(faceRect));
    form.append("labels", JSON.stringify(products.map((p) => p.label)));

    const res = await fetch(`${API_URL}/api/tryon`, { method: "POST", body: form });

    if (!res.ok) {
        let message = "Could not generate your look. Please try again.";
        try {
            const data = await res.json();
            if (data?.error) message = data.error;
        } catch {
            /* keep default message */
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