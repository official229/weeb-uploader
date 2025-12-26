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
	let problematicFiles = $state<
		Array<{ file: File; path: string; detectedType: string; actualExtension: string }>
	>([]);
	let isValidating = $state(false);

	const allowedMimeTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/vnd.comicbook+zip', // .cbz is a zip file
		'application/zip', // .zip files
		'application/json',
		'text/xml' // comicinfo.xml
	];

	const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'cbz', 'zip', 'xml'];

	/**
	 * Extracts an archive file (.cbz or .zip) and creates virtual File objects with fake paths
	 * to simulate a subfolder structure
	 */
	async function extractArchiveFile(archiveFile: File): Promise<File[]> {
		const archiveExtension = archiveFile.name.split('.').pop()?.toLowerCase();
		const isCbz = archiveExtension === 'cbz';
		const isZip = archiveExtension === 'zip';

		if (!isCbz && !isZip) {
			throw new Error(`Unsupported archive format: ${archiveExtension}`);
		}

		console.log(`Extracting ${archiveExtension} file:`, archiveFile.name);
		const zipReader = new zip.ZipReader(new zip.BlobReader(archiveFile));
		const entries = await zipReader.getEntries();
		const extractedFiles: File[] = [];

		// Get the base name of the archive file (without extension) for the virtual folder
		const archiveBaseName = archiveFile.name.replace(/\.(cbz|zip)$/i, '');
		const originalPath = archiveFile.webkitRelativePath || archiveFile.name;

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
			// The path will be: {originalPath}/{archiveBaseName}/{entryPath}
			// This preserves the directory structure inside the archive
			// entryPath already includes any subdirectories (e.g., "chapter1/page1.png")
			const virtualPath = originalPath.includes('/')
				? `${originalPath.split('/').slice(0, -1).join('/')}/${archiveBaseName}/${entryPath}`
				: `${archiveBaseName}/${entryPath}`;

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
	 * Extracts a .cbz file and creates virtual File objects with fake paths
	 * to simulate a subfolder structure
	 * @deprecated Use extractArchiveFile instead
	 */
	async function extractCbzFile(cbzFile: File): Promise<File[]> {
		return extractArchiveFile(cbzFile);
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

	/**
	 * Detects the actual image type from magic numbers
	 * Returns the detected extension or null if not a recognized image format
	 */
	async function detectImageTypeFromMagicNumber(file: File): Promise<string | null> {
		// Read first 12 bytes to detect image type
		const buffer = await file.slice(0, 12).arrayBuffer();
		const bytes = new Uint8Array(buffer);

		// PNG: 89 50 4E 47 0D 0A 1A 0A
		if (
			bytes.length >= 8 &&
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47
		) {
			return 'png';
		}

		// JPEG: FF D8 FF
		if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
			return 'jpg';
		}

		// GIF: 47 49 46 38 39 61 (GIF89a) or 47 49 46 38 37 61 (GIF87a)
		if (
			bytes.length >= 6 &&
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38 &&
			(bytes[4] === 0x39 || bytes[4] === 0x37) &&
			bytes[5] === 0x61
		) {
			return 'gif';
		}

		// WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
		if (
			bytes.length >= 12 &&
			bytes[0] === 0x52 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x46 &&
			bytes[8] === 0x57 &&
			bytes[9] === 0x45 &&
			bytes[10] === 0x42 &&
			bytes[11] === 0x50
		) {
			return 'webp';
		}

		return null;
	}

	/**
	 * Validates image files by checking if their extension matches their magic number
	 * Returns array of problematic files with their paths and detected types
	 */
	async function validateImageFiles(
		files: File[]
	): Promise<Array<{ file: File; path: string; detectedType: string; actualExtension: string }>> {
		const problematic: Array<{
			file: File;
			path: string;
			detectedType: string;
			actualExtension: string;
		}> = [];
		const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

		for (const file of files) {
			const extension = file.name.split('.').pop()?.toLowerCase();

			// Only check image files
			if (!extension || !imageExtensions.includes(extension)) {
				continue;
			}

			const detectedType = await detectImageTypeFromMagicNumber(file);

			// If we couldn't detect a type, skip (might not be an image or corrupted)
			if (!detectedType) {
				continue;
			}

			// Handle jpeg/jpg equivalence
			const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
			const normalizedDetectedType = detectedType === 'jpeg' ? 'jpg' : detectedType;

			// If detected type doesn't match the extension
			if (normalizedDetectedType !== normalizedExtension) {
				const path = (file as any).webkitRelativePath || file.name;
				problematic.push({
					file,
					path,
					detectedType,
					actualExtension: extension
				});
			}
		}

		return problematic;
	}

	async function handleChangeFiles(event: Event) {
		isExtracting = true;
		problematicFiles = [];

		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);

		// Separate archive files (.cbz and .zip) from other files
		const archiveFiles = files.filter((file) => {
			const extension = file.name.split('.').pop()?.toLowerCase();
			return extension === 'cbz' || extension === 'zip';
		});

		const otherFiles = files.filter((file) => {
			const extension = file.name.split('.').pop()?.toLowerCase();
			const mimeType = file.type;
			return (
				extension !== 'cbz' &&
				extension !== 'zip' &&
				allowedExtensions.includes(extension ?? '') &&
				allowedMimeTypes.includes(mimeType)
			);
		});

		// Extract all archive files and get their contents
		const extractedFiles: File[] = [];
		for (const archiveFile of archiveFiles) {
			try {
				const filesFromArchive = await extractArchiveFile(archiveFile);
				extractedFiles.push(...filesFromArchive);
			} catch (error) {
				console.error(`Error extracting ${archiveFile.name}:`, error);
			}
		}

		// Combine other files with extracted files, filtering out the original archive files
		selectedFiles = [...otherFiles, ...extractedFiles];

		console.log('Selected files:', selectedFiles);

		isExtracting = false;
		isValidating = true;

		// Validate image files for correct extensions based on magic numbers
		problematicFiles = await validateImageFiles(selectedFiles);

		isValidating = false;

		// Only call onDone if there are no problematic files
		if (problematicFiles.length === 0) {
			onDone();
		}
	}

	function onClick(e: Event) {
		inputElementRef?.click();
	}
</script>

<div class="flex flex-col justify-center items-center gap-4">
	<button
		class="flex flex-col justify-center items-center clickable-hint b-2 border-surface rounded-md p-4 {className} disabled:opacity-50 disabled:cursor-not-allowed"
		onclick={onClick}
		disabled={isExtracting || isValidating}
	>
		<h1 class="font-bold text-app">Folder Selector</h1>
		<input
			class="hidden"
			bind:this={inputElementRef}
			type="file"
			webkitdirectory={true}
			multiple={true}
			onchange={handleChangeFiles}
		/>
	</button>

	{#if isExtracting || isValidating}
		<div class="flex flex-col justify-center items-center gap-2">
			<div class="animate-spin rounded-full h-8 w-8 outline-dotted outline-5 border-surface"></div>
			<p class="text-sm text-muted">
				{isExtracting ? 'Processing files...' : 'Validating files...'}
			</p>

			{#if currentlyProcessingFile}
				<p class="text-sm text-muted">{currentlyProcessingFile}</p>
			{/if}
		</div>
	{/if}

	{#if problematicFiles.length > 0}
		<div class="flex flex-col gap-2 w-full max-w-2xl">
			<p class="text-sm font-semibold text-red-500">
				Found {problematicFiles.length} file{problematicFiles.length === 1 ? '' : 's'} with incorrect
				extensions:
			</p>
			<div class="flex flex-col gap-1 max-h-64 overflow-y-auto">
				{#each problematicFiles as { file, path, detectedType, actualExtension }}
					<div class="text-sm text-muted border-l-2 border-red-500 pl-2">
						<p class="font-medium">{path}</p>
						<p class="text-xs">
							Extension: <span class="font-mono">.{actualExtension}</span> → Detected type:
							<span class="font-mono">.{detectedType}</span>
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
