import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export type FaceRect = { x: number; y: number; w: number; h: number };

let detector: FaceDetector | null = null;

export async function detectFace(dataUrl: string): Promise<FaceRect | null> {
    try {
        if (!detector) {
            const fileset = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            detector = await FaceDetector.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                },
                runningMode: "IMAGE",
            });
        }
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const box = detector.detect(img).detections[0]?.boundingBox;
        if (!box) return null;
        return {
            x: box.originX / img.naturalWidth,
            y: box.originY / img.naturalHeight,
            w: box.width / img.naturalWidth,
            h: box.height / img.naturalHeight,
        };
    } catch {
        return null;
    }
}