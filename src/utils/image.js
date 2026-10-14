/* Reduce el logo antes de guardarlo: se guarda como texto base64 y se copia en
   cada cotización, así que una foto de 3 MB pesaba 3 MB por cotización. */

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export async function logoFileToDataUrl(file, maxSize = 320) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen (PNG o JPG).");
    if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen supera 8 MB. Usa una más liviana.");

    const original = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.readAsDataURL(file);
    });

    // SVG se deja tal cual (es liviano y escalable).
    if (file.type === "image/svg+xml") return original;

    const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("No se pudo procesar la imagen."));
        el.src = original;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    // PNG conserva transparencia; si pesa mucho, se usa JPEG.
    const png = canvas.toDataURL("image/png");
    if (png.length < 150_000) return png;
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
}
