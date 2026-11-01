<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue';

import { v4 as uuidv4 } from 'uuid';
import UZIP from 'uzip';

import { PunctuationPosition, ThemePreference } from './types/ThemePreference';
import { normalizeThemeProperties, serializeThemeProperties, ThemeProperties } from './types/ThemeProperties';
import type { BackgroundImageAssets } from './types/BackgroundImageAssets';
import { PixelDark } from './theme-preset';

import { TextKeyboard } from './layouts';

import KawaiiBar from './components/KawaiiBar.vue';
import KeyboardWindow from './components/KeyboardWindow.vue';
import PreferenceEditor from './components/PreferenceEditor.vue';
import ThemeEditor from './components/ThemeEditor.vue';

import { readFileAsArrayBuffer, readFileAsString, saveBlobAs } from './utils/file-operations';
import { language, setLanguage, t, type Language } from './i18n';

setLanguage(language.value);

const preference = ref<ThemePreference>({
    border: false,
    horizontalMargin: 3,
    verticalMargin: 7,
    radius: 4,
    puncPosition: PunctuationPosition.Bottom
});

const theme = ref<ThemeProperties>({ ...PixelDark, name: uuidv4() });
const backgroundAssets = shallowRef<BackgroundImageAssets | null>(null);

const file = ref<HTMLInputElement>();

const onLanguageChange = (e: Event) => {
    setLanguage((e.target as HTMLSelectElement).value as Language);
};

const importTheme = () => file.value?.click();

const textDecoder = new TextDecoder();

const setBackgroundAssets = (assets: BackgroundImageAssets | null) => {
    if (backgroundAssets.value) {
        URL.revokeObjectURL(backgroundAssets.value.croppedPreviewUrl);
        URL.revokeObjectURL(backgroundAssets.value.sourcePreviewUrl);
    }
    backgroundAssets.value = assets;
};

onBeforeUnmount(() => setBackgroundAssets(null));

const imageMimeType = (path: string) => {
    switch (path.split('.').pop()?.toLowerCase()) {
        case 'png': return 'image/png';
        case 'webp': return 'image/webp';
        case 'gif': return 'image/gif';
        case 'jpg':
        case 'jpeg':
        default: return 'image/jpeg';
    }
};

const fileExtension = (blob: Blob, fileName: string) => {
    switch (blob.type.toLowerCase()) {
        case 'image/png': return 'png';
        case 'image/jpeg': return 'jpg';
        case 'image/webp': return 'webp';
        case 'image/gif': return 'gif';
        default: {
            const extension = fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1];
            if (!extension) throw new Error(`Unsupported image format: ${blob.type || fileName}`);
            return extension.toLowerCase();
        }
    }
};

const basename = (path: string) => path.split(/[\\/]/).pop() || path;

const onFileInputChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
        let str = '';
        let zip: Record<string, Uint8Array> | null = null;
        if (file.name.endsWith('.json')) {
            str = await readFileAsString(file);
        } else if (file.name.endsWith('.zip')) {
            const buffer = await readFileAsArrayBuffer(file);
            zip = UZIP.parse(buffer);
            const jsonFile = Object.keys(zip).find(k => k.endsWith('.json'));
            if (!jsonFile) {
                alert(t('import.notFound'));
                return;
            }
            str = textDecoder.decode(zip[jsonFile]);
        } else {
            alert(t('import.invalidType'));
            return;
        }
        const importedTheme = normalizeThemeProperties(JSON.parse(str));
        const background = importedTheme.backgroundImage;
        if (zip && background?.croppedFilePath && background.srcFilePath) {
            const croppedBytes = zip[background.croppedFilePath];
            const sourceBytes = zip[background.srcFilePath];
            if (croppedBytes && sourceBytes) {
                const croppedBlob = new Blob([croppedBytes.slice().buffer], {
                    type: imageMimeType(background.croppedFilePath)
                });
                const originalFile = new File(
                    [sourceBytes.slice().buffer],
                    basename(background.srcFilePath),
                    { type: imageMimeType(background.srcFilePath) }
                );
                const croppedPreviewUrl = URL.createObjectURL(croppedBlob);
                const sourcePreviewUrl = URL.createObjectURL(originalFile);
                setBackgroundAssets({
                    originalFile,
                    croppedBlob,
                    croppedPreviewUrl,
                    sourcePreviewUrl
                });
                importedTheme.backgroundImage = {
                    ...background,
                    croppedFilePath: croppedPreviewUrl,
                    srcFilePath: sourcePreviewUrl
                };
            } else {
                setBackgroundAssets(null);
            }
        } else {
            setBackgroundAssets(null);
        }
        theme.value = importedTheme;
    } catch (error) {
        console.error('Failed to import theme:', error);
        alert(t('import.invalidContent'));
    } finally {
        input.value = '';
    }
};

const textEncoder = new TextEncoder();

const blobToBytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

const dataUriToBlob = async (uri: string) => {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Failed to decode a theme image data URI.');
    return response.blob();
};

const bakeBackgroundOverlay = async (blob: Blob, color: string, opacity: number) => {
    if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Invalid background overlay color.');
    if (!Number.isFinite(opacity)) throw new Error('Invalid background overlay opacity.');

    const image = await createImageBitmap(blob);
    try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to create a canvas context for the background image.');

        context.drawImage(image, 0, 0);
        context.globalAlpha = Math.min(100, Math.max(0, opacity)) / 100;
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);

        return await new Promise<Blob>((resolve, reject) => {
            try {
                canvas.toBlob(
                    result => result
                        ? resolve(result)
                        : reject(new Error('Failed to encode the background image with its overlay.')),
                    blob.type
                );
            } catch (error) {
                reject(error instanceof Error ? error : new Error('Failed to encode the background image with its overlay.'));
            }
        });
    } finally {
        image.close();
    }
};

const exportTheme = async () => {
    try {
        const rawTheme = serializeThemeProperties(theme.value);
        const files: Record<string, Uint8Array> = {};
        const safeName = theme.value.name.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/[. ]+$/g, '') || 'theme';
        const background = rawTheme.backgroundImage;
        if (background) {
            let originalBlob: Blob;
            let croppedBlob: Blob;
            let originalName: string;

            if (backgroundAssets.value) {
                originalBlob = backgroundAssets.value.originalFile;
                croppedBlob = backgroundAssets.value.croppedBlob;
                originalName = backgroundAssets.value.originalFile.name;
            } else if (
                background.srcFilePath?.startsWith('data:') &&
                background.croppedFilePath?.startsWith('data:')
            ) {
                originalBlob = await dataUriToBlob(background.srcFilePath);
                croppedBlob = await dataUriToBlob(background.croppedFilePath);
                originalName = `source.${fileExtension(originalBlob, 'source.jpg')}`;
            } else {
                throw new Error('BACKGROUND_IMAGE_ASSETS_MISSING');
            }

            const sourcePath = `${safeName}-src.${fileExtension(originalBlob, originalName)}`;
            background.srcFilePath = sourcePath;
            files[sourcePath] = await blobToBytes(originalBlob);
            if (background.overlayColor !== undefined || background.overlayOpacity !== undefined) {
                croppedBlob = await bakeBackgroundOverlay(
                    croppedBlob,
                    background.overlayColor ?? '#000000',
                    background.overlayOpacity ?? 20
                );
            }
            const croppedPath = `${safeName}-cropped.${fileExtension(croppedBlob, 'cropped.jpg')}`;
            background.croppedFilePath = croppedPath;
            files[croppedPath] = await blobToBytes(croppedBlob);
        }

        const exportedTheme = {
            ...rawTheme,
            backgroundImage: background
                ? {
                    croppedFilePath: background.croppedFilePath,
                    srcFilePath: background.srcFilePath,
                    brightness: background.brightness ?? 50,
                    cropRect: background.cropRect
                }
                : null
        };
        const json = JSON.stringify(exportedTheme);
        files[`${safeName}.json`] = textEncoder.encode(json);
        const zip = UZIP.encode(files);
        saveBlobAs(new Blob([zip], { type: 'application/zip' }), `${safeName}.zip`);
    } catch (error) {
        console.error('Failed to export theme:', error);
        alert(error instanceof Error && error.message === 'BACKGROUND_IMAGE_ASSETS_MISSING'
            ? t('theme.exportImageMissing')
            : t('theme.exportFailed'));
    }
};
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <div>
                <h1>{{ t('app.title') }}</h1>
                <p>{{ t('app.subtitle') }}</p>
            </div>
            <label class="language-picker">
                <span>{{ t('app.language') }}</span>
                <select :value="language" @change="onLanguageChange">
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                </select>
            </label>
        </header>
        <main class="workspace-grid">
            <div class="preview-column">
                <section class="preview-card">
                    <h2>{{ t('app.preview') }}</h2>
                    <div class="preview-stage">
                        <div class="input-view">
                            <KawaiiBar :preference="preference" :theme="theme" />
                            <KeyboardWindow :preference="preference" :layout="TextKeyboard" :theme="theme" />
                        </div>
                    </div>
                </section>
                <PreferenceEditor v-model="preference" />
            </div>
            <ThemeEditor
                v-model="theme"
                @import="importTheme"
                @export="exportTheme"
                @background-assets="setBackgroundAssets"
            />
        </main>
        <input ref="file" type="file" accept=".json,.zip" hidden @change="onFileInputChange">
    </div>
</template>
