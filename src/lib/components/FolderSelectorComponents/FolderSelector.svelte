<script lang="ts">
	import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';

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
		const zipReader = new ZipReader(new BlobReader(cbzFile));
		const entries = await zipReader.getEntries();
		const extractedFiles: File[] = [];

		// Get the base name of the .cbz file (without extension) for the virtual folder
		const cbzBaseName = cbzFile.name.replace(/\.cbz$/i, '');
		const originalPath = cbzFile.webkitRelativePath || cbzFile.name;

		for (const entry of entries) {
			// Skip directories
			if (!entry.filename || entry.directory) {
				continue;
			}

			// Check if the entry is an image file
			const entryExtension = entry.filename.split('.').pop()?.toLowerCase();
			if (!entryExtension || !allowedExtensions.includes(entryExtension)) {
				continue;
			}

			// Extract the file content
			const blob = await entry.getData(new BlobWriter());
			const fileName = entry.filename.split('/').pop() || entry.filename;

			// Create a File object with a virtual path
			// The path will be: {originalPath}/{cbzBaseName}/{fileName}
			// This creates a virtual subfolder structure
			const virtualPath = originalPath.includes('/')
				? `${originalPath.split('/').slice(0, -1).join('/')}/${cbzBaseName}/${fileName}`
				: `${cbzBaseName}/${fileName}`;

			const virtualFile = new File([blob], fileName, {
				type: blob.type || getMimeTypeFromExtension(entryExtension)
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
