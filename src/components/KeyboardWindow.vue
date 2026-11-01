<script setup lang="ts">
import { computed, ref } from 'vue';
import type { StyleValue } from 'vue';

import { ThemePreference } from '../types/ThemePreference';
import { KeyAppearance, KeyAppearanceAltText, KeyAppearanceText, KeyAppearanceType, KeyViewId } from '../types/KeyDef';
import { ThemeProperties } from '../types/ThemeProperties';

import KeyView from './KeyView/KeyView.vue';
import { PunctuationMap } from '../layouts';

const props = defineProps<{
    preference: ThemePreference;
    layout: KeyAppearance[][];
    theme: ThemeProperties;
}>();

const backgroundImage = computed(() => props.theme.backgroundImage ?? null);
const backgroundImageUrl = computed(() => backgroundImage.value?.croppedFilePath || backgroundImage.value?.srcFilePath);

const keyboardStyle = computed<StyleValue>(() => backgroundImageUrl.value ? {} : ({
    backgroundColor: props.preference.border ? props.theme.backgroundColor : props.theme.keyboardColor
}));

const backgroundImageStyle = computed<StyleValue>(() => ({
    backgroundImage: `url(${JSON.stringify(backgroundImageUrl.value)})`,
    filter: `brightness(${(backgroundImage.value?.brightness ?? 50) / 100})`
}));

const backgroundOverlayStyle = computed<StyleValue>(() => ({
    backgroundColor: backgroundImage.value?.overlayColor ?? '#000000',
    opacity: (backgroundImage.value?.overlayOpacity ?? 20) / 100
}));

const caps = ref(false);
const transformAlphabet = (c: string) => caps.value ? c.toUpperCase() : c.toLowerCase();

const active = ref(true);
const transformSpace = () => active.value ? '拼音' : 'English';
const transformPunctuation = (c: string) => active.value ? PunctuationMap[c] ?? c : c;

const realLayout = computed(() => props.layout.map(
    row => row.map(key => {
        if (key.viewId === KeyViewId.Space) {
            return {
                ...key as KeyAppearanceText,
                displayText: transformSpace()
            } satisfies KeyAppearanceText;
        }
        switch (key.type) {
            case KeyAppearanceType.AltText: {
                const { displayText, altText } = key as KeyAppearanceAltText;
                return {
                    ...key as KeyAppearanceAltText,
                    displayText: Object.hasOwn(PunctuationMap, displayText)
                        ? transformPunctuation(displayText)
                        : transformAlphabet(displayText),
                    altText: transformPunctuation(altText)
                } satisfies KeyAppearanceAltText;
            }
            default:
                return key;
        }
    })
));

const onKeyClick = (key: KeyAppearance) => {
    switch (key.viewId) {
        case KeyViewId.CapsLock: {
            caps.value = !caps.value;
            break;
        }
        case KeyViewId.LangSwitch: {
            active.value = !active.value;
            break;
        }
        default:
            break;
    }
};
</script>

<template>
    <div class="keyboard" :style="keyboardStyle">
        <div v-if="backgroundImageUrl" class="keyboard__background" :style="backgroundImageStyle"></div>
        <div v-if="backgroundImageUrl" class="keyboard__overlay" :style="backgroundOverlayStyle"></div>
        <div v-for="(keyRow, rowIndex) of realLayout" :key="rowIndex" class="keyrow">
            <KeyView
                v-for="(key, keyIndex) of keyRow"
                :key="`row${rowIndex}key${keyIndex}`"
                :preference="preference"
                :appearance="key"
                :theme="theme"
                @click="onKeyClick"
            />
        </div>
    </div>
</template>

<style>
.keyboard {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    user-select: none;
}

.keyboard__background,
.keyboard__overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.keyboard__background {
    z-index: 0;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
}

.keyboard__overlay {
    z-index: 1;
}

.keyrow {
    position: relative;
    z-index: 2;
    display: flex;
    flex-basis: 25%;
    justify-content: center;
}
</style>
