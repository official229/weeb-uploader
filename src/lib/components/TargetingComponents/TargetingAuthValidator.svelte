<script lang="ts">
	import { resolve } from '$app/paths';
	import { apiAuthContext, ApiAuthContext } from '$lib/core/GlobalState.svelte';
	import axios from 'axios';
	import { getContext, onMount, setContext } from 'svelte';

	const STORAGE_KEY = 'weebdex_api_token';
	const API_ENDPOINT = 'https://api.weebdex.org/upload/check-approval-required';

	const authContext = getContext(apiAuthContext) as ApiAuthContext;
	if (!authContext) {
		throw new Error(
			'TargetingAuthValidator must be used within a component that provides ApiAuthContext context'
		);
	}

	let inputValue = $state('');
	let validated = $state(false);
	let isValidating = $state(false);
	let validationError = $state<string | null>(null);

	onMount(() => {
		if (typeof window !== 'undefined') {
			const storedToken = sessionStorage.getItem(STORAGE_KEY);
			if (storedToken) {
				authContext.apiToken = storedToken;
			}
		}

		if (authContext.apiToken) {
			validateApiAccess(authContext.apiToken);
		}
	});

	function setApiToken(token: string | null) {
		authContext.apiToken = token;
		if (typeof window !== 'undefined') {
			if (token) {
				sessionStorage.setItem(STORAGE_KEY, token);
			} else {
				sessionStorage.removeItem(STORAGE_KEY);
			}
		}
	}

	async function validateApiAccess(token: string | null) {
		if (!token) {
			validationError = 'Please enter an API token';
			return;
		}

		isValidating = true;
		validationError = null;

		try {
			const response = await axios.post(
				API_ENDPOINT,
				{
					language: 'en'
				},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (response.status === 204) {
				// user is approved for uploads
				setApiToken(token);
				validated = true;
				validationError = null;
			} else if (response.status === 200) {
				// approval required, let's not spam the approval queue
				validationError =
					'You do not yet have any uploaded chapters. Please manually upload your first chapter and wait for approval';
				setApiToken(null);
				validated = false;
			} else {
				validationError = `Validation failed: ${response.status} ${response.statusText}`;
				setApiToken(null);
				validated = false;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to validate API access';
			setApiToken(null);
			validated = false;
		} finally {
			isValidating = false;
		}
	}

	function reset() {
		setApiToken(null);
		inputValue = '';
		validationError = null;
		validated = false;
	}
</script>

<div class="flex flex-col gap-2 p-4 bg-gray-100 rounded-lg">
	<h2 class="text-xl font-semibold">API Authentication</h2>

	{#if validated === true}
		<div class="flex flex-row gap-2 items-center">
			<p>API access validated successfully</p>
			<button
				disabled={isValidating}
				class="clickable-hint p-2 rounded-md"
				type="button"
				onclick={reset}>Reset Token</button
			>
		</div>
	{:else}
		<p>
			Enter your API token to validate your access to the WeebDex API. You can find this token by
			opening up the developer tools (F12 on keyboard) in your browser and navigating to the
			"Network" tab. Then, refresh the page and click on the "XHR" tab within the "Network" tab. You
			will see a list of requests. Clicking on one should open up a panel with the request details.
			Click on the "Cookies" tab within the request details panel (note that not all requests have
			cookies, the /check request will have one though). You will see a a cookie called
			"ory_kratos_session". That is your API token.
		</p>

		<a
			href={`${resolve('/docs')}#api-token-where`}
			class="text-sm text-gray-500 hover:text-blue-500"
		>
			If you're having trouble, click here for the relevant tutorial & docs section (this resets
			your progress in the uploader).
			<span class="text-gray-500 w-4 h-4 i-mdi-arrow-top-right inline-block align-middle"></span>
		</a>

		<div class="flex flex-row gap-2 w-full items-center">
			<label for="api-token-input">API Token:</label>
			<input
				id="api-token-input"
				type="text"
				bind:value={inputValue}
				disabled={isValidating}
				placeholder="Enter your API token"
				class="border border-gray-300 bg-white rounded-md p-2 grow-1"
			/>
		</div>

		<button
			disabled={isValidating}
			class="clickable-hint p-2 rounded-md"
			type="button"
			onclick={() => validateApiAccess(inputValue.trim())}>Validate API Access</button
		>

		{#if validationError}
			<p class="text-red-500">{validationError}</p>
		{/if}

		{#if isValidating}
			<p>Validating...</p>
		{/if}
	{/if}
</div>
