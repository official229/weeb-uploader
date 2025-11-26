import { defineConfig, presetIcons, presetWind4 } from "unocss";

export default defineConfig({
	presets: [
		presetWind4({
			dark: "class",
			preflights: {
				theme: true,
			},
		}),
		presetIcons(),
	]
});
