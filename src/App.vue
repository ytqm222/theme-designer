<script setup lang="ts">
import { ref } from 'vue';

import { v4 as uuidv4 } from 'uuid';
import UZIP from 'uzip';

import { PunctuationPosition, ThemePreference } from './types/ThemePreference';
import { normalizeThemeProperties, serializeThemeProperties, ThemeProperties } from './types/ThemeProperties';
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

const file = ref<HTMLInputElement>();

const onLanguageChange = (e: Event) => {
    setLanguage((e.target as HTMLSelectElement).value as Language);
};

const importTheme = () => file.value?.click();

const textDecoder = new TextDecoder();

const onFileInputChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
        let str = '';
        if (file.name.endsWith('.json')) {
            str = await readFileAsString(file);
        } else if (file.name.endsWith('.zip')) {
            const buffer = await readFileAsArrayBuffer(file);
            const zip = UZIP.parse(buffer);
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
        theme.value = normalizeThemeProperties(JSON.parse(str));
    } catch (error) {
        console.error('Failed to import theme:', error);
        alert(t('import.invalidContent'));
    } finally {
        input.value = '';
    }
};

const textEncoder = new TextEncoder();

const exportTheme = async () => {
    const json = JSON.stringify(serializeThemeProperties(theme.value));
    const zip = UZIP.encode({
        [`${theme.value.name}.json`]: textEncoder.encode(json)
    });
    const blob = new Blob([zip], { type: 'application/zip' });
    saveBlobAs(blob, `${theme.value.name}.zip`);
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
            <ThemeEditor v-model="theme" @import="importTheme" @export="exportTheme" />
        </main>
        <input ref="file" type="file" accept=".json,.zip" hidden @change="onFileInputChange">
    </div>
</template>
