<script setup lang="ts">
import { inject } from 'vue';

import type { FnOpenColorPicker } from '../ThemeEditor.vue';

const props = defineProps<{
    name: string;
    value: string;
}>();

const emit = defineEmits<{
    update: [value: string]
}>();

const openColorPicker = inject<FnOpenColorPicker>('openColorPicker') ?? (() => { });

const onColorChange = (color: string) => emit('update', color);

const onColorSampleClick = (e: MouseEvent) => {
    openColorPicker(props.name, props.value, onColorChange, e.currentTarget as HTMLButtonElement);
};
</script>

<template>
    <button :id="name" type="button" :aria-label="name" @click="onColorSampleClick"></button>
</template>

<style scoped>
button {
    background-color: v-bind(value);
    display: block;
    border: none;
    border-radius: 6px;
    height: 24px;
    width: 40px;
}
</style>
