<script lang="ts">
	import { asset, assets, resolve } from '$app/paths';

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

	<div class="flex flex-col gap-2" id="guided-uploader">
		<a
			href="#guided-uploader"
			onclick={() => copyHrefToClipboard('guided-uploader')}
			class="text-2xl font-bold hover:text-blue-500"
		>
			How do I use the Guided Zip Manga Uploader?
			<span class="text-sm text-gray-500 i-mdi-link w-4 h-4 inline-block"></span>
		</a>

		<p>
			The Guided Zip Manga Uploader provides a step-by-step workflow to help you upload manga
			chapters from zip files if you've downloaded the Dekai Manga Archive. Select the Dekai Manga
			Archive folder, then pick out the manga you wish to upload. Everything after is guided so
			you're only there to check nothing went wrong when uploading and to help it move along.

			<br />
			<b>
				Note: Root folder selector and the following manga selector take a while and the page will
				look like nothing is happening. This is expected.
			</b>
		</p>

		<div class="flex flex-col gap-2 items-center">
			<img
				src={asset('/guided-upload.gif')}
				alt="Guided Uploader Workflow"
				class="h-auto max-w-full rounded-md"
			/>
		</div>
	</div>
</div>
