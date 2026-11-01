<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

import { t } from '../i18n';

const props = defineProps<{
    file: File;
}>();

const emit = defineEmits<{
    cancel: [],
    crop: [result: {
        croppedBlob: Blob;
        cropRect: { top: number; left: number; right: number; bottom: number };
    }],
    error: [error: Error]
}>();

const image = ref<HTMLImageElement>();
const cropper = ref<Cropper>();
const cropperReady = ref(false);
const imageUrl = URL.createObjectURL(props.file);

const onImageError = () => emit('error', new Error('Failed to load the image for cropping.'));

onMounted(() => {
    if (!image.value) {
        emit('error', new Error('Cropper image element is unavailable.'));
        return;
    }

    cropper.value = new Cropper(image.value, {
        aspectRatio: 4 / 3,
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
        background: false,
        ready: () => {
            cropperReady.value = true;
        },
        error: onImageError
    });
});

onBeforeUnmount(() => {
    cropper.value?.destroy();
    URL.revokeObjectURL(imageUrl);
});

const saveCrop = () => {
    if (!cropper.value || !cropperReady.value) {
        emit('error', new Error('Image cropper is not ready.'));
        return;
    }

    const data = cropper.value.getData(true);
    const canvas = cropper.value.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    if (!canvas) {
        emit('error', new Error('Failed to create a canvas for the cropped image.'));
        return;
    }
    const type = props.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    try {
        canvas.toBlob(blob => {
            if (!blob) {
                emit('error', new Error('Failed to encode the cropped image.'));
                return;
            }

            emit('crop', {
                croppedBlob: blob,
                cropRect: {
                    top: data.y,
                    left: data.x,
                    right: data.x + data.width,
                    bottom: data.y + data.height
                }
            });
        }, type, 0.92);
    } catch (error) {
        emit('error', error instanceof Error ? error : new Error('Failed to encode the cropped image.'));
    }
};
</script>

<template>
    <div class="cropper-dialog-backdrop">
        <section
            class="cropper-dialog"
            role="dialog"
            aria-modal="true"
            :aria-label="t('theme.cropTitle')"
        >
            <h3>{{ t('theme.cropTitle') }}</h3>
            <div class="cropper-dialog__viewport">
                <img ref="image" :src="imageUrl" :alt="t('theme.cropTitle')" @error="onImageError">
            </div>
            <div class="cropper-dialog__actions">
                <button type="button" class="button button--secondary" @click="emit('cancel')">
                    {{ t('theme.cropCancel') }}
                </button>
                <button
                    type="button"
                    class="button button--primary"
                    :disabled="!cropperReady"
                    @click="saveCrop"
                >
                    {{ t('theme.cropApply') }}
                </button>
            </div>
        </section>
    </div>
</template>

<style>
.cropper-dialog-backdrop {
    position: fixed;
    z-index: 1100;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgb(17 24 39 / 64%);
}

.cropper-dialog {
    width: min(720px, 100%);
    max-height: 100%;
    overflow: auto;
    padding: 20px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 16px 48px rgb(0 0 0 / 28%);
}

.cropper-dialog h3 {
    margin: 0 0 16px;
}

.cropper-dialog__viewport {
    max-height: min(65vh, 560px);
}

.cropper-dialog__viewport img {
    display: block;
    max-width: 100%;
}

.cropper-dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}
</style>
