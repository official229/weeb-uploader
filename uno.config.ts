import { defineConfig, presetIcons, presetWind4 } from 'unocss';
import extractorSvelte from '@unocss/extractor-svelte';

export default defineConfig({
	presets: [
		presetWind4({
			dark: 'class',
			preflights: {
				theme: true
			}
		}),
		presetIcons()
	],
	shortcuts: [['clickable-hint', 'cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors']],
	extractors: [extractorSvelte()]
});
