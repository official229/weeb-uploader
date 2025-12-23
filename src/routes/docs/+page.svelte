<script lang="ts">
	import { resolve } from '$app/paths';

	function copyHrefToClipboard(href: string) {
		const host = resolve('/docs');
		const basename = window.location.host;
		const hrefFull = `${basename}${host}#${href}`;

		navigator.clipboard.writeText(hrefFull);
	}
</script>

<div class="container mx-auto flex flex-col gap-5">
	<a href={resolve('/')} class="mt-5 text-blue-500 hover:text-blue-600">
		Back to Uploader Improved
	</a>

	<div class="flex flex-col gap-2" id="api-token-where">
		<a
			href="#api-token-where"
			onclick={() => copyHrefToClipboard('api-token-where')}
			class="text-2xl font-bold hover:text-blue-500"
		>
			Where do I find my API token?
			<span class="text-sm text-gray-500 i-mdi-link w-4 h-4 inline-block"></span>
		</a>

		<p>
			You can find your API token by opening up the developer tools (F12 on keyboard) in your
			browser and following the steps below:
		</p>
		<div class="flex flex-row gap-2">
			<div class="flex flex-col gap-2 w-1/2 items-center">
				<p>Firefox</p>
				<img src={resolve('/token-firefox.png' as any)} alt="API Token" class="h-auto" />
			</div>
			<div class="flex flex-col gap-2 w-1/2 items-center">
				<p>Chromium</p>
				<img src={resolve('/token-chromium.png' as any)} alt="API Token" class="h-auto" />
			</div>
		</div>
	</div>
</div>
