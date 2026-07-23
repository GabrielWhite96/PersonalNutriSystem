/** Compresses an image for chat/vision payloads (keeps quality usable for food analysis). */
export async function compressImageFile(
  file: File,
  options?: { maxDimension?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") {
    return file;
  }

  const maxDimension = options?.maxDimension ?? 1280;
  const quality = options?.quality ?? 0.82;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto-refeicao";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function captureCameraPhoto(): Promise<File | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  let stream: MediaStream | null = null;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
    });

    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Não foi possível abrir a câmera."));
    });
    await video.play();

    // Give autofocus a brief moment on mobile cameras.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob) return null;

    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");

    return new File([blob], `foto-refeicao-${timestamp}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    video.pause();
    video.srcObject = null;
  }
}
