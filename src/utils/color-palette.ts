interface ColorBucket {
    count: number;
    red: number;
    green: number;
    blue: number;
}

export async function extractColorPalette(file: File, limit = 8): Promise<string[]> {
    const bitmap = await createImageBitmap(file);
    try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 64 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas 2D context is unavailable.');

        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map<number, ColorBucket>();

        for (let index = 0; index < pixels.length; index += 4) {
            const alpha = pixels[index + 3];
            if (alpha < 128) continue;

            const red = pixels[index];
            const green = pixels[index + 1];
            const blue = pixels[index + 2];
            const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
            const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
            bucket.count++;
            bucket.red += red;
            bucket.green += green;
            bucket.blue += blue;
            buckets.set(key, bucket);
        }

        const colors = [...buckets.values()]
            .map(bucket => ({
                count: bucket.count,
                red: Math.round(bucket.red / bucket.count),
                green: Math.round(bucket.green / bucket.count),
                blue: Math.round(bucket.blue / bucket.count)
            }))
            .sort((a, b) => b.count - a.count);
        const selected: typeof colors = [];

        for (const color of colors) {
            if (selected.every(existing => colorDistance(color, existing) >= 28)) {
                selected.push(color);
                if (selected.length === limit) break;
            }
        }
        if (selected.length < limit) {
            for (const color of colors) {
                if (!selected.includes(color)) selected.push(color);
                if (selected.length === limit) break;
            }
        }

        return selected.map(({ red, green, blue }) =>
            `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
        );
    } finally {
        bitmap.close();
    }
}

function colorDistance(a: ColorBucket, b: ColorBucket): number {
    return Math.hypot(a.red - b.red, a.green - b.green, a.blue - b.blue);
}
