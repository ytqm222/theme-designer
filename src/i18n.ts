import { ref } from 'vue';

export type Language = 'zh' | 'en';

const translations = {
    zh: {
        'app.title': 'FCITX5 安卓主题设计器',
        'app.subtitle': '预览、定制并导出你的键盘主题',
        'app.preview': '键盘预览',
        'app.language': '语言',
        'preference.title': '键盘设置',
        'theme.title': '主题编辑器',
        'theme.loadPreset': '加载预设',
        'theme.confirmPreset': '确定要用预设「{name}」覆盖当前主题吗？',
        'theme.background': '背景图片',
        'theme.backgroundUpload': '上传背景图片',
        'theme.backgroundReplace': '更换图片',
        'theme.brightness': '亮度',
        'theme.overlayColor': '蒙版颜色',
        'theme.chooseOverlayColor': '选择蒙版颜色',
        'theme.overlayOpacity': '蒙版透明度',
        'theme.palette': '图片主色',
        'theme.paletteHint': '点击色码即可复制',
        'theme.paletteLoading': '正在提取图片颜色…',
        'theme.paletteUnavailable': '未能从图片中提取颜色，请尝试其他图片。',
        'theme.paletteCopied': '已复制 {color}',
        'theme.copyFailed': '复制失败，请检查浏览器剪贴板权限。',
        'theme.colors': '主题配色',
        'theme.import': '导入主题',
        'theme.export': '导出主题',
        'theme.color': '颜色',
        'theme.close': '关闭',
        'theme.uploadFailed': '无法读取图片，请确认文件有效后重试。',
        'theme.invalidImage': '请选择有效的图片文件。',
        'import.notFound': '压缩包中没有找到主题 JSON 文件。',
        'import.invalidType': '文件格式无效，请选择 .json 或 .zip 文件。',
        'import.invalidContent': '文件内容无效，请选择有效的主题 JSON 文件。',
        'uuid.new': '生成新 UUID',
        'field.name': '主题名称',
        'field.backgroundColor': '背景颜色',
        'field.barColor': '候选栏颜色',
        'field.keyboardColor': '键盘颜色',
        'field.keyBackgroundColor': '按键背景色',
        'field.keyTextColor': '按键文字颜色',
        'field.candidateTextColor': '候选文字颜色',
        'field.candidateLabelColor': '候选标签颜色',
        'field.candidateCommentColor': '候选注释颜色',
        'field.altKeyBackgroundColor': '次要按键背景色',
        'field.altKeyTextColor': '次要按键文字颜色',
        'field.accentKeyBackgroundColor': '强调按键背景色',
        'field.accentKeyTextColor': '强调按键文字颜色',
        'field.keyPressHighlightColor': '按键按下高亮色',
        'field.keyShadowColor': '按键阴影颜色',
        'field.popupBackgroundColor': '弹出框背景色',
        'field.popupTextColor': '弹出框文字颜色',
        'field.spaceBarColor': '空格键颜色',
        'field.dividerColor': '分隔线颜色',
        'field.clipboardEntryColor': '剪贴板条目颜色',
        'field.genericActiveBackgroundColor': '通用激活背景色',
        'field.genericActiveForegroundColor': '通用激活前景色',
        'field.isDark': '深色主题',
        'field.border': '显示按键边框',
        'field.horizontalMargin': '水平间距',
        'field.verticalMargin': '垂直间距',
        'field.radius': '按键圆角',
        'preset.Pixel Dark': '像素深色',
        'preset.Pixel Light': '像素浅色'
    },
    en: {
        'app.title': 'FCITX5 Android Theme Designer',
        'app.subtitle': 'Preview, customize, and export your keyboard theme',
        'app.preview': 'Keyboard preview',
        'app.language': 'Language',
        'preference.title': 'Keyboard settings',
        'theme.title': 'Theme editor',
        'theme.loadPreset': 'Load preset',
        'theme.confirmPreset': 'Replace the current theme with preset "{name}"?',
        'theme.background': 'Background image',
        'theme.backgroundUpload': 'Upload background image',
        'theme.backgroundReplace': 'Change image',
        'theme.brightness': 'Brightness',
        'theme.overlayColor': 'Overlay color',
        'theme.chooseOverlayColor': 'Choose overlay color',
        'theme.overlayOpacity': 'Overlay opacity',
        'theme.palette': 'Image palette',
        'theme.paletteHint': 'Click a color code to copy it',
        'theme.paletteLoading': 'Extracting image colors…',
        'theme.paletteUnavailable': 'Could not extract colors from this image. Try another image.',
        'theme.paletteCopied': 'Copied {color}',
        'theme.copyFailed': 'Copy failed. Check your browser clipboard permissions.',
        'theme.colors': 'Theme colors',
        'theme.import': 'Import theme',
        'theme.export': 'Export theme',
        'theme.color': 'Color',
        'theme.close': 'Close',
        'theme.uploadFailed': 'Could not read the image. Verify the file and try again.',
        'theme.invalidImage': 'Please choose a valid image file.',
        'import.notFound': 'No theme JSON file was found in the archive.',
        'import.invalidType': 'Invalid file type. Choose a .json or .zip file.',
        'import.invalidContent': 'Invalid file content. Choose a valid theme JSON file.',
        'uuid.new': 'Generate new UUID',
        'field.name': 'Theme name',
        'field.backgroundColor': 'Background color',
        'field.barColor': 'Candidate bar color',
        'field.keyboardColor': 'Keyboard color',
        'field.keyBackgroundColor': 'Key background color',
        'field.keyTextColor': 'Key text color',
        'field.candidateTextColor': 'Candidate text color',
        'field.candidateLabelColor': 'Candidate label color',
        'field.candidateCommentColor': 'Candidate comment color',
        'field.altKeyBackgroundColor': 'Alternate key background',
        'field.altKeyTextColor': 'Alternate key text color',
        'field.accentKeyBackgroundColor': 'Accent key background',
        'field.accentKeyTextColor': 'Accent key text color',
        'field.keyPressHighlightColor': 'Key press highlight',
        'field.keyShadowColor': 'Key shadow color',
        'field.popupBackgroundColor': 'Popup background color',
        'field.popupTextColor': 'Popup text color',
        'field.spaceBarColor': 'Space bar color',
        'field.dividerColor': 'Divider color',
        'field.clipboardEntryColor': 'Clipboard entry color',
        'field.genericActiveBackgroundColor': 'Generic active background',
        'field.genericActiveForegroundColor': 'Generic active foreground',
        'field.isDark': 'Dark theme',
        'field.border': 'Show key borders',
        'field.horizontalMargin': 'Horizontal spacing',
        'field.verticalMargin': 'Vertical spacing',
        'field.radius': 'Key corner radius',
        'preset.Pixel Dark': 'Pixel Dark',
        'preset.Pixel Light': 'Pixel Light'
    }
} as const;

const language = ref<Language>(readSavedLanguage());

function readSavedLanguage(): Language {
    try {
        return localStorage.getItem('theme-designer-language') === 'en' ? 'en' : 'zh';
    } catch {
        return 'zh';
    }
}

export function setLanguage(value: Language) {
    language.value = value;
    document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en';
    document.title = value === 'zh'
        ? 'FCITX5 安卓主题设计器'
        : 'FCITX5 Android Theme Designer';
    try {
        localStorage.setItem('theme-designer-language', value);
    } catch {
        // The selected language still applies for this session when storage is unavailable.
    }
}

export { language };

export function t(key: string, values: Record<string, string | number> = {}): string {
    const catalog = translations[language.value] as Record<string, string>;
    const fallback = translations.en as Record<string, string>;
    return (catalog[key] ?? fallback[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
