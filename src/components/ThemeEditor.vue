<script setup lang="ts">
import { computed, reactive, ref, provide } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import { ColorPicker } from 'vue-color-kit';
import 'vue-color-kit/dist/vue-color-kit.css';

import { ThemeProperties, ThemePropertyType, ThemePropertiesTypes } from '../types/ThemeProperties';
import { PixelDark, PixelLight } from '../theme-preset';
import { FormItemType } from './FormItem/FormItem';

import FormItem from './FormItem/FormItem.vue';

export interface FnOpenColorPicker {
    (name: string, initialColor: string, callback: (color: string) => void): void
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
    if (!confirm(`Override editing theme with preset "${selected}"?`)) return;
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
        const type: FormItemType | null = EntryType[ThemePropertiesTypes[name as keyof typeof ThemePropertiesTypes]];
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

const onColorPickerChange = (color: { r: number, g: number, b: number, a: number }) => {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    picker.onChange(`#${r}${g}${b}${a}`);
};

function hexa2rgba(hexa: string): string {
    const r = Number.parseInt(hexa.substring(1, 3), 0x10);
    const g = Number.parseInt(hexa.substring(3, 5), 0x10);
    const b = Number.parseInt(hexa.substring(5, 7), 0x10);
    const a = Number.parseInt(hexa.substring(7, 9), 0x10) / 0xff;
    return `${r}, ${g}, ${b}, ${a.toFixed(3)}`;
}

const openColorPicker: FnOpenColorPicker = (name, initialColor, callback) => {
    colorPicker.value?.inputRgba(hexa2rgba(initialColor));
    picker.name = name;
    picker.open = true;
    picker.onChange = callback;
};

provide<FnOpenColorPicker>('openColorPicker', openColorPicker);

const closeColorPicker = () => {
    picker.open = false;
    picker.onChange = () => { };
};

// --- 上传和截取底图功能逻辑 ---
const bgFileInput = ref<HTMLInputElement>();
const bgPreviewUrl = ref('');
const brightness = ref(50);

const triggerBgUpload = () => bgFileInput.value?.click();

const onBgFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const base64 = reader.result as string;
        bgPreviewUrl.value = base64;
        updateThemeBackgroundImage(base64);
    };
    reader.readAsDataURL(file);
};

const updateThemeBackgroundImage = (base64Data: string) => {
    model.value = {
        ...props.modelValue,
        backgroundImage: {
            croppedFilePath: base64Data,
            srcFilePath: base64Data,
            brightness: brightness.value,
            cropRect: {
                top: 0,
                right: 360,
                bottom: 270,
                left: 0
            }
        }
    };
};

const onBrightnessChange = () => {
    if (props.modelValue.backgroundImage) {
        const currentBg = props.modelValue.backgroundImage as any;
        model.value = {
            ...props.modelValue,
            backgroundImage: {
                ...currentBg,
                brightness: brightness.value
            }
        };
    }
};
</script>

<template>
    <div class="theme-editor">
        <table>
            <tbody>
                <tr>
                    <th>Load Preset</th>
                    <td>
                        <select :value="''" @input="onSelectPreset">
                            <option v-for="p of Presets" :key="p.name" :value="p.name">
                                {{ p.name }}
                            </option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th colspan="2" style="padding-top:15px; color:#1a73e8;">
                        Background Image (底图配置)
                    </th>
                </tr>
                <tr>
                    <th>Skin Background</th>
                    <td>
                        <input type="button" value="Upload Background Image" @click="triggerBgUpload">
                        <input ref="bgFileInput" type="file" accept="image/*" style="display:none" @change="onBgFileChange">
                        <div v-if="modelValue.backgroundImage" style="margin-top: 8px;">
                            <label style="font-size: 12px; display:block; margin-bottom:4px;">Brightness (亮度: {{ brightness }}%)</label>
                            <input type="range" min="0" max="100" v-model.number="brightness" @input="onBrightnessChange">
                        </div>
                    </td>
                </tr>
                <tr>
                    <th colspan="2">
                        Theme Colors
                    </th>
                </tr>
                <template v-for="item of entries" :key="item.name">
                    <FormItem v-if="item.type !== null" v-bind="item" @update="onPropUpdate" />
                </template>
                <tr>
                    <th></th>
                    <td>
                        <input type="button" value="Import" @click="emit('import')">
                        <span>&nbsp;</span>
                        <input type="button" value="Export" @click="emit('export')">
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-show="picker.open" class="color-picker">
            <table class="color-picker__title">
                <tbody>
                    <tr>
                        <th>Color</th>
                        <td v-text="picker.name"></td>
                    </tr>
                </tbody>
            </table>
            <ColorPicker ref="colorPicker" theme="light" @change-color="onColorPickerChange" />
            <input class="color-picker__close" type="button" value="Close" @click="closeColorPicker">
        </div>
    </div>
</template>

<style>
.theme-editor {
    display: flex;
}

.color-picker {
    background-color: #f7f8f9;
    margin-left: 16px;
}

.color-picker__title {
    padding: 0 10px;
}

.color-picker__close {
    margin: 10px;
}

.hu-color-picker {
    box-shadow: none;
}
</style>