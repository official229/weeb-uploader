<script lang="ts">
	interface Props {
		validated?: boolean;
	}

	const API_ENDPOINT = 'https://api.weebdex.org/upload/check-approval-required';

	let { 
		validated = $bindable(false)
	}: Props = $props();

	let isValidating = $state(false);
	let validationError = $state<string | null>(null);

	async function validateApiAccess() {
		isValidating = true;
		validationError = null;

		try {
			const response = await fetch(API_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					language: 'en'
				})
			});

			if (response.ok) {
				// Validation successful - API access confirmed
				validated = true;
				validationError = null;
			} else {
				// Validation failed
				validationError = `Validation failed: ${response.status} ${response.statusText}`;
				validated = false;
			}
		} catch (error) {
			validationError = error instanceof Error ? error.message : 'Failed to validate API access';
			validated = false;
		} finally {
			isValidating = false;
		}
	}

	function reset() {
		validated = false;
		validationError = null;
	}
</script>

<div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
	<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">API Authentication</h2>
	
	{#if validated}
		<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
					</svg>
					<span class="text-green-800 dark:text-green-200 font-medium">API access validated successfully</span>
				</div>
				<button
					type="button"
					onclick={reset}
					class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded transition-colors"
				>
					Reset
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Validate that you can make API calls. This will use your existing authentication cookies.
			</p>

			{#if validationError}
				<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
					<p class="text-sm text-red-800 dark:text-red-200">{validationError}</p>
				</div>
			{/if}

			<button
				type="button"
				onclick={validateApiAccess}
				disabled={isValidating}
				class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
			>
				{#if isValidating}
					<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span>Validating...</span>
				{:else}
					<span>Validate API Access</span>
				{/if}
			</button>
		</div>
	{/if}
</div>

