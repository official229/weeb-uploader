<script lang="ts">
	import * as zip from '@zip.js/zip.js';

	// Configure zip.js to disable web workers
	// This may help avoid the outputSize error that occurs when workers aren't properly initialized
	zip.configure({
		useWebWorkers: false
	});

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
	let isExtracting = $state(false);
	let currentlyProcessingFile = $state<string | null>(null);

	const allowedMimeTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/vnd.comicbook+zip', // .cbz is a zip file
		'application/json',
		'text/xml' // comicinfo.xml
	];

	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'cbz', 'xml'];

	/**
	 * Extracts a .cbz file and creates virtual File objects with fake paths
	 * to simulate a subfolder structure
	 */
	async function extractCbzFile(cbzFile: File): Promise<File[]> {
		console.log('Extracting .cbz file:', cbzFile.name);
		const zipReader = new zip.ZipReader(new zip.BlobReader(cbzFile));
		const entries = await zipReader.getEntries();
		const extractedFiles: File[] = [];

		// Get the base name of the .cbz file (without extension) for the virtual folder
		const cbzBaseName = cbzFile.name.replace(/\.cbz$/i, '');
		const originalPath = cbzFile.webkitRelativePath || cbzFile.name;

		for (const entry of entries) {
			// Skip directory entries (we only process files, not empty directories)
			// Note: File entries can have directory paths in their filenames (e.g., "chapter1/page1.png")
			// which we preserve in the virtual path below
			if (!entry.filename || entry.directory) {
				continue;
			}

			currentlyProcessingFile = entry.filename;

			// Check if the entry is an image file
			const entryExtension = entry.filename.split('.').pop()?.toLowerCase();
			if (!entryExtension || !allowedExtensions.includes(entryExtension)) {
				continue;
			}

			// Extract the file content with error handling for problematic entries

			const entryStream = new TransformStream();
			const blobPromise = new Response(entryStream.readable).blob();

			// Write the entry data to the stream
			await entry.getData(entryStream.writable);

			// Get the blob from the stream
			let blob = await blobPromise;

			// Ensure blob has correct MIME type
			if (!blob.type) {
				const mimeType = getMimeTypeFromExtension(entryExtension);
				blob = new Blob([blob], { type: mimeType });
			}

			// Preserve the full path from the archive, including directory structure
			const entryPath = entry.filename;
			const fileName = entryPath.split('/').pop() ?? entryPath;

			// Create a File object with a virtual path
			// The path will be: {originalPath}/{cbzBaseName}/{entryPath}
			// This preserves the directory structure inside the archive
			// entryPath already includes any subdirectories (e.g., "chapter1/page1.png")
			const virtualPath = originalPath.includes('/')
				? `${originalPath.split('/').slice(0, -1).join('/')}/${cbzBaseName}/${entryPath}`
				: `${cbzBaseName}/${entryPath}`;

			const virtualFile = new File([blob], fileName, {
				type: blob.type
			});

			// Set the webkitRelativePath to create the virtual folder structure
			Object.defineProperty(virtualFile, 'webkitRelativePath', {
				value: virtualPath,
				writable: false,
				enumerable: true,
				configurable: true
			});

			extractedFiles.push(virtualFile);
		}

		await zipReader.close();
		currentlyProcessingFile = null;

		return extractedFiles;
	}

	/**
	 * Gets MIME type from file extension
	 */
	function getMimeTypeFromExtension(extension: string): string {
		const mimeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp'
		};
		return mimeMap[extension] || 'application/octet-stream';
	}

	async function handleChangeFiles(event: Event) {
		isExtracting = true;

		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);

		// Separate .cbz files from other files
		const cbzFiles = files.filter((file) => {
			const extension = file.name.split('.').pop()?.toLowerCase();
			return extension === 'cbz';
		});

		const otherFiles = files.filter((file) => {
			const extension = file.name.split('.').pop()?.toLowerCase();
			const mimeType = file.type;
			return (
				extension !== 'cbz' &&
				allowedExtensions.includes(extension ?? '') &&
				allowedMimeTypes.includes(mimeType)
			);
		});

		// Extract all .cbz files and get their contents
		const extractedFiles: File[] = [];
		for (const cbzFile of cbzFiles) {
			try {
				const filesFromCbz = await extractCbzFile(cbzFile);
				extractedFiles.push(...filesFromCbz);
			} catch (error) {
				console.error(`Error extracting ${cbzFile.name}:`, error);
			}
		}

		// Combine other files with extracted files, filtering out the original .cbz files
		selectedFiles = [...otherFiles, ...extractedFiles];

		console.log('Selected files:', selectedFiles);

		isExtracting = false;
		onDone();
	}

	function onClick(e: Event) {
		inputElementRef?.click();
	}
</script>

<div class="flex flex-col justify-center items-center gap-4">
	<button
		class="flex flex-col justify-center items-center clickable-hint b-2 rounded-md p-4 {className} disabled:opacity-50 disabled:cursor-not-allowed"
		onclick={onClick}
		disabled={isExtracting}
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

	{#if isExtracting}
		<div class="flex flex-col justify-center items-center gap-2">
			<div class="animate-spin rounded-full h-8 w-8 outline-dotted outline-5"></div>
			<p class="text-sm text-gray-500">Processing files...</p>

			{#if currentlyProcessingFile}
				<p class="text-sm text-gray-500">{currentlyProcessingFile}</p>
			{/if}
		</div>
	{/if}
</div>
