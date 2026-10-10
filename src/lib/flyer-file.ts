// A flyer file, ready to send to the flyer reader: phone photos shrunk to
// 1600px JPEG, PDFs as they are. Used by the admin's flyer sheet and the
// sign-up wizard.

/** Phone photos are big: send at most 1600px, as JPEG, so it's quick and under the upload limit. */
export async function shrink(file: File): Promise<{ type: string; data: string; blob?: Blob }> {
  if (file.type === "application/pdf") {
    if (file.size > 3 * 1024 * 1024) throw new Error("That PDF is too big. Use one under 3 MB, or a photo of the flyer.");
    return { type: file.type, data: await toBase64(file) };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file can't be read. Use a JPG or PNG photo, or a PDF.");
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("That file can't be read. Use a JPG or PNG photo, or a PDF.");
  return { type: "image/jpeg", data: await toBase64(blob), blob };
}

export const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("That file can't be read."));
    reader.readAsDataURL(blob);
  });
