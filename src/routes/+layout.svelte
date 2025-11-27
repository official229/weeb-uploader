<script lang="ts">
	import { setContext } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { GlobalState, globalStateContext } from '$lib/core/GlobalState.svelte';

	let { children } = $props();

	// Create and provide global state
	const globalState = new GlobalState();
	setContext(globalStateContext, globalState);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
