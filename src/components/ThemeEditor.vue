<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, provide } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import { ColorPicker } from 'vue-color-kit';
import 'vue-color-kit/dist/vue-color-kit.css';

import { ThemeBackgroundImage, ThemeProperties, ThemePropertyType, ThemePropertiesTypes } from '../types/ThemeProperties';
import { PixelDark, PixelLight } from '../theme-preset';
import { FormItemType } from './FormItem/FormItem';

import FormItem from './FormItem/FormItem.vue';
import { t } from '../i18n';
import { extractColorPalette } from '../utils/color-palette';

export interface FnOpenColorPicker {
    (name: string, initialColor: string, callback: (color: string) => void, anchor: HTMLElement): void
}

const props = defineProps<{
    modelValue: ThemeProperties
}>();

const emit = defineEmits<{
    import: [],
    export: []
}>();

const model = defineModel<ThemeProperties>();

const Presets = [
    PixelDark,
    PixelLight
];

const loadPreset = (preset: ThemeProperties) => {
    model.value = {
        ...preset,
        name: uuidv4()
    };
};

const onSelectPreset = (e: Event) => {
    const selected = (e.target as HTMLSelectElement).value;
    const preset = Presets.find(p => p.name === selected);
    if (!preset) return;
    if (!confirm(t('theme.confirmPreset', { name: t(`preset.${selected}`) }))) return;
    loadPreset(preset);
};

const EntryType: Record<ThemePropertyType, FormItemType | null> = {
    [ThemePropertyType.Unknown]: null,
    [ThemePropertyType.Boolean]: FormItemType.Bool,
    [ThemePropertyType.Color]: FormItemType.Color,
    [ThemePropertyType.UUID]: FormItemType.UUID
};

const entries = computed(() => {
    const result = [];
    for (const [name, value] of Object.entries(props.modelValue)) {
        const propType = ThemePropertiesTypes[name as keyof typeof ThemePropertiesTypes];

        if (propType === undefined) continue;

        const type = EntryType[propType];
        if (type === null) continue;

        result.push({ name, type, value });
    }
    return result;
});

const onPropUpdate = (k: string, v: boolean | string) => {
    model.value = {
        ...props.modelValue,
        [k]: v
    };
};

const picker = reactive({
    open: false,
    name: '',
    onChange: (_color: string) => { },
});
const colorPicker = ref<InstanceType<typeof ColorPicker>>();
const colorPickerPanel = ref<HTMLDivElement>();
const colorPickerPosition = reactive({ top: '0px', left: '0px' });
let colorPickerAnchor: HTMLElement | null = null;

const onColorPickerChange = (color: {
    rgba: { r: number, g: number, b: number, a: number }
}) => {
    const { r, g, b, a } = color.rgba;
    const hex = [r, g, b, Math.round(a * 255)]
        .map(channel => channel.toString(16).padStart(2, '0'))
        .join('');
    picker.onChange(`#${hex}`);
};

function hexa2rgba(hexa: string): string {
    const r = Number.parseInt(hexa.substring(1, 3), 0x10);
    const g = Number.parseInt(hexa.substring(3, 5), 0x10);
    const b = Number.parseInt(hexa.substring(5, 7), 0x10);
    const a = Number.parseInt(hexa.substring(7, 9), 0x10) / 0xff;
    return `${r}, ${g}, ${b}, ${a.toFixed(3)}`;
}

const updateColorPickerPosition = () => {
    if (!picker.open || !colorPickerAnchor?.isConnected || !colorPickerPanel.value) return;

    const anchorRect = colorPickerAnchor.getBoundingClientRect();
    const panelRect = colorPickerPanel.value.getBoundingClientRect();
    const gap = 12;
    const viewportPadding = 12;
    const right = anchorRect.right + gap;
    const leftOfAnchor = anchorRect.left - panelRect.width - gap;
    const left = right + panelRect.width <= window.innerWidth - viewportPadding
        ? right
        : leftOfAnchor >= viewportPadding
            ? leftOfAnchor
            : Math.max(viewportPadding, Math.min(right, window.innerWidth - panelRect.width - viewportPadding));
    const top = Math.max(
        viewportPadding,
        Math.min(
            anchorRect.top + (anchorRect.height - panelRect.height) / 2,
            window.innerHeight - panelRect.height - viewportPadding
        )
    );

    colorPickerPosition.left = `${left}px`;
    colorPickerPosition.top = `${top}px`;
};

const stopTrackingColorPicker = () => {
    window.removeEventListener('resize', updateColorPickerPosition);
    window.removeEventListener('scroll', updateColorPickerPosition, true);
};

const openColorPicker: FnOpenColorPicker = async (name, initialColor, callback, anchor) => {
    colorPicker.value?.inputRgba(hexa2rgba(initialColor));
    picker.name = name;
    picker.open = true;
    picker.onChange = callback;
    colorPickerAnchor = anchor;
    stopTrackingColorPicker();
    window.addEventListener('resize', updateColorPickerPosition);
    window.addEventListener('scroll', updateColorPickerPosition, true);
    await nextTick();
    updateColorPickerPosition();
};

provide<FnOpenColorPicker>('openColorPicker', openColorPicker);

const closeColorPicker = () => {
    picker.open = false;
    picker.onChange = () => { };
    colorPickerAnchor = null;
    stopTrackingColorPicker();
};

onBeforeUnmount(stopTrackingColorPicker);

const bgFileInput = ref<HTMLInputElement>();
const defaultOverlayColor = '#000000';
const defaultOverlayOpacity = 20;

const backgroundImage = computed(() => props.modelValue.backgroundImage ?? null);
const brightness = computed({
    get: () => backgroundImage.value?.brightness ?? 50,
    set: (value: number) => updateBackgroundImage({ brightness: value })
});
const overlayColor = computed(() => backgroundImage.value?.overlayColor ?? defaultOverlayColor);
const overlayOpacity = computed({
    get: () => backgroundImage.value?.overlayOpacity ?? defaultOverlayOpacity,
    set: (value: number) => updateBackgroundImage({ overlayOpacity: value })
});

const triggerBgUpload = () => bgFileInput.value?.click();

const updateThemeBackgroundImage = (base64Data: string) => {
    const currentBackground = backgroundImage.value;
    model.value = {
        ...props.modelValue,
        backgroundImage: {
            ...currentBackground,
            croppedFilePath: base64Data,
            srcFilePath: base64Data,
            brightness: currentBackground?.brightness ?? 50,
            overlayColor: currentBackground?.overlayColor ?? defaultOverlayColor,
            overlayOpacity: currentBackground?.overlayOpacity ?? defaultOverlayOpacity,
            cropRect: {
                top: 0,
                right: 360,
                bottom: 270,
                left: 0
            }
        }
    };
};

const updateBackgroundImage = (updates: Partial<ThemeBackgroundImage>) => {
    const currentBackground = backgroundImage.value;
    if (!currentBackground) return;

    model.value = {
        ...props.modelValue,
        backgroundImage: {
            ...currentBackground,
            ...updates
        }
    };
};

const openOverlayColorPicker = (e: MouseEvent) => {
    openColorPicker(t('theme.overlayColor'), `${overlayColor.value}ff`, color => {
        updateBackgroundImage({ overlayColor: color.substring(0, 7) });
    }, e.currentTarget as HTMLElement);
};

const palette = ref<string[]>([]);
const paletteStatusKey = ref('');
const copiedColor = ref('');

const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Image file did not produce a data URL.'));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
});

const onBgFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    palette.value = [];
    paletteStatusKey.value = '';
    if (file.type && !file.type.startsWith('image/')) {
        paletteStatusKey.value = 'theme.invalidImage';
        input.value = '';
        return;
    }
    try {
        updateThemeBackgroundImage(await readImageFile(file));
    } catch (error) {
        console.error('Failed to read background image:', error);
        paletteStatusKey.value = 'theme.uploadFailed';
        input.value = '';
        return;
    }

    paletteStatusKey.value = 'theme.paletteLoading';
    try {
        palette.value = await extractColorPalette(file);
        paletteStatusKey.value = palette.value.length ? '' : 'theme.paletteUnavailable';
    } catch (error) {
        console.error('Failed to extract background image colors:', error);
        paletteStatusKey.value = 'theme.paletteUnavailable';
    } finally {
        input.value = '';
    }
};

const copyColor = async (color: string) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(color);
        } else {
            const input = document.createElement('textarea');
            input.value = color;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            const copied = document.execCommand('copy');
            input.remove();
            if (!copied) throw new Error('Browser refused clipboard access.');
        }
        copiedColor.value = color;
        paletteStatusKey.value = 'theme.paletteCopied';
    } catch (error) {
        console.error('Failed to copy image color:', error);
        paletteStatusKey.value = 'theme.copyFailed';
    }
};
</script>

<template>
    <div class="theme-editor">
        <h2>{{ t('theme.title') }}</h2>
        <table>
            <tbody>
                <tr>
                    <th>{{ t('theme.loadPreset') }}</th>
                    <td>
                        <select :value="''" @input="onSelectPreset">
                            <option v-for="p of Presets" :key="p.name" :value="p.name">
                                {{ t(`preset.${p.name}`) }}
                            </option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th colspan="2" class="theme-editor__section-title">
                        {{ t('theme.background') }}
                    </th>
                </tr>
                <tr>
                    <th>{{ t('theme.background') }}</th>
                    <td>
                        <button type="button" class="button button--secondary" @click="triggerBgUpload">
                            {{ modelValue.backgroundImage ? t('theme.backgroundReplace') : t('theme.backgroundUpload') }}
                        </button>
                        <input ref="bgFileInput" type="file" accept="image/*" hidden @change="onBgFileChange">
                        <div v-if="modelValue.backgroundImage" class="background-controls">
                            <label class="control-label">{{ t('theme.brightness') }} ({{ brightness }}%)</label>
                            <input v-model.number="brightness" class="range-input" type="range" min="0" max="100">
                            <label class="control-label">{{ t('theme.overlayColor') }}</label>
                            <button
                                type="button"
                                class="theme-editor__color-swatch"
                                :style="{ backgroundColor: overlayColor }"
                                :aria-label="t('theme.chooseOverlayColor')"
                                @click="openOverlayColorPicker"
                            ></button>
                            <label class="control-label">{{ t('theme.overlayOpacity') }} ({{ overlayOpacity }}%)</label>
                            <input v-model.number="overlayOpacity" class="range-input" type="range" min="0" max="100">
                            <div v-if="palette.length" class="color-palette">
                                <div class="color-palette__heading">
                                    <strong>{{ t('theme.palette') }}</strong>
                                    <span>{{ t('theme.paletteHint') }}</span>
                                </div>
                                <div class="color-palette__swatches">
                                    <button
                                        v-for="color of palette"
                                        :key="color"
                                        type="button"
                                        class="color-palette__color"
                                        :aria-label="`${color} — ${t('theme.paletteHint')}`"
                                        @click="copyColor(color)"
                                    >
                                        <span class="color-palette__sample" :style="{ backgroundColor: color }"></span>
                                        <code>{{ color }}</code>
                                    </button>
                                </div>
                            </div>
                            <p v-if="paletteStatusKey" class="theme-editor__status" role="status">
                                {{ t(paletteStatusKey, { color: copiedColor }) }}
                            </p>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th colspan="2" class="theme-editor__section-title">
                        {{ t('theme.colors') }}
                    </th>
                </tr>
                <template v-for="item of entries" :key="item.name">
                    <FormItem v-if="item.type !== null" v-bind="item" @update="onPropUpdate" />
                </template>
                <tr>
                    <th></th>
                    <td>
                        <div class="theme-editor__actions">
                            <button type="button" class="button button--secondary" @click="emit('import')">{{ t('theme.import') }}</button>
                            <button type="button" class="button button--primary" @click="emit('export')">{{ t('theme.export') }}</button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <Teleport to="body">
            <div
                v-show="picker.open"
                ref="colorPickerPanel"
                class="color-picker"
                :style="colorPickerPosition"
            >
                <table class="color-picker__title">
                    <tbody>
                        <tr>
                            <th>{{ t('theme.color') }}</th>
                            <td v-text="picker.name"></td>
                        </tr>
                    </tbody>
                </table>
                <ColorPicker ref="colorPicker" theme="light" @change-color="onColorPickerChange" />
                <input class="color-picker__close" type="button" :value="t('theme.close')" @click="closeColorPicker">
            </div>
        </Teleport>
    </div>
</template>

<style>
.theme-editor {
    min-width: 0;
}

.theme-editor__color-swatch {
    width: 44px;
    height: 36px;
    padding: 0;
    border: 1px solid #777;
    border-radius: 6px;
    cursor: pointer;
}

.color-picker {
    position: fixed;
    z-index: 1000;
    width: 340px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    overflow: auto;
    padding: 12px;
    border: 1px solid #e1e4ec;
    border-radius: 10px;
    background-color: #f7f8f9;
    box-shadow: 0 12px 36px rgb(22 29 49 / 24%);
}

.color-picker__title {
    padding: 0 10px;
}

.color-picker__close {
    margin-top: 10px;
}

.hu-color-picker {
    box-shadow: none;
}

.theme-editor__section-title {
    padding-top: 20px;
    color: #5362a5;
}

.background-controls {
    margin-top: 16px;
}

.control-label {
    display: block;
    margin: 14px 0 6px;
    font-size: 0.9rem;
    font-weight: 600;
}

.range-input {
    width: 100%;
    accent-color: #5865c5;
}

.color-palette {
    margin-top: 20px;
}

.color-palette__heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-bottom: 10px;
}

.color-palette__heading span {
    color: #6b7280;
    font-size: 0.82rem;
    font-weight: 400;
}

.color-palette__swatches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 8px;
}

.color-palette__color {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    border: 1px solid #e1e4ec;
    border-radius: 8px;
    background: #fff;
    color: #273047;
    cursor: pointer;
    text-align: left;
}

.color-palette__color:hover {
    border-color: #5865c5;
}

.color-palette__sample {
    height: 28px;
    border-radius: 4px;
}

.color-palette__color code {
    font-size: 0.75rem;
}

.theme-editor__status {
    min-height: 1.25em;
    margin: 10px 0 0;
    color: #5362a5;
    font-size: 0.85rem;
}

.theme-editor__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
