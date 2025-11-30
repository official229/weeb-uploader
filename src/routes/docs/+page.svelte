<script lang="ts">
	import { resolve } from '$app/paths';

	function copyHrefToClipboard(href: string) {
		const host = resolve('/docs');
		const basename = window.location.host;
		const hrefFull = `${basename}${host}#${href}`;

		navigator.clipboard.writeText(hrefFull);
	}
</script>

<div class="container my-5 mx-auto flex flex-col gap-5">
	<a href={resolve('/improved')} class="text-blue-500 hover:text-blue-600">
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
			browser and navigating to the "Network" tab. Then, refresh the page and click on the "XHR" tab
			within the "Network" tab. You will see a list of requests. Clicking on one should open up a
			panel with the request details. Click on the "Cookies" tab within the request details panel
			(note that not all requests have cookies, the /check request will have one though). You will
			see a a cookie called "ory_kratos_session". That is your API token.
		</p>
		<img src="/api-token-where.png" alt="API Token" class="w-full h-auto" />
	</div>
</div>
