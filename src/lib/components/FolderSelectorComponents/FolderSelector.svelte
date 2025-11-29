<script lang="ts">
	interface Props {
		selectedFiles: File[] | null;
		class?: string;
		onDone: () => void;
	}

	let {
		selectedFiles = $bindable<File[] | null>(null),
		class: className = '',
		onDone
	}: Props = $props();

	let inputElementRef: HTMLInputElement | null = $state(null);

	const allowedMimeTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/zip' // .cbz is a zip file
	];

	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'cbz'];

	function handleChangeFiles(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);

		// just filter it from the very start to only relevant files
		const filteredFiles = files.filter((file) => {
			const extension = file.name.split('.').pop()?.toLowerCase();
			const mimeType = file.type;
			return allowedExtensions.includes(extension ?? '') && allowedMimeTypes.includes(mimeType);
		});

		selectedFiles = filteredFiles;

		onDone();
	}

	function onClick(e: Event) {
		inputElementRef?.click();
	}
</script>

<button
	class="flex flex-col justify-center items-center clickable-hint b-2 rounded-md p-4 {className}"
	onclick={onClick}
>
	<h1 class="font-bold">Folder Selector</h1>
	<input
		class="hidden"
		bind:this={inputElementRef}
		type="file"
		webkitdirectory={true}
		multiple={true}
		onchange={handleChangeFiles}
	/>
</button>
