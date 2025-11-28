import axios, { type AxiosProgressEvent } from 'axios';
import { RATE_LIMITER_SESSION, RATE_LIMITER_UPLOAD } from './ApiWithRateLimit.svelte';
import { cluster } from 'radashi';

export class ScanGroup {
	public groupId = $state<string>('');
	public groupName = $state<string>('');
}

export class ChapterUploadingGroup {
	public groupIds = $state<string[] | null>(null);
}

export class ChapterUploadingSeries {
	public seriesId = $state<string>('');
}

export enum ChapterPageStatus {
	NOT_STARTED = 'NOT_STARTED',
	WAITING = 'WAITING',
	UPLOADING = 'UPLOADING',
	UPLOADED = 'UPLOADED',
	FAILED = 'FAILED'
}

export class ChapterPageState {
	public pageName = $state<string>('');
	public pageIndex = $state<number>(0);
	public pageFile = $state<File>(null as unknown as File); // Required, will be set in constructor
	public status = $state<ChapterPageStatus>(ChapterPageStatus.NOT_STARTED);
	public progress = $state<number>(0); // 0 - 1 normalized progress
	public error = $state<string | null>(null);
	public associatedUploadSessionFileId = $state<string | null>(null);

	public constructor(
		pageName: string,
		pageIndex: number,
		pageFile: File,
		status: ChapterPageStatus = ChapterPageStatus.NOT_STARTED,
		progress: number = 0,
		error: string | null = null,
		associatedUploadSessionFileId: string | null = null
	) {
		this.pageName = pageName;
		this.pageIndex = pageIndex;
		this.pageFile = pageFile;
		this.status = status;
		this.progress = progress;
		this.error = error;
		this.associatedUploadSessionFileId = associatedUploadSessionFileId;
	}

	public async uploadToSession(sessionId: string, authToken: string): Promise<void> {
		// Set status to uploading before starting
		this.status = ChapterPageStatus.UPLOADING;
		this.progress = 0;
		this.error = null;

		const formData = new FormData();
		formData.append('file', this.pageFile);

		const onUploadProgress = (progressEvent: AxiosProgressEvent) => {
			this.progress = Number(progressEvent.progress?.toFixed(2) ?? 0);
		};

		try {
			const response = await RATE_LIMITER_UPLOAD.makeRequest(() =>
				axios.post(`https://api.weebdex.org/upload/${sessionId}`, formData, {
					headers: {
						Authorization: `Bearer ${authToken}`
					},
					onUploadProgress: onUploadProgress
				})
			);

			const data = response.data;

			// API returns an array of responses, we only expect 1
			if (!Array.isArray(data) || data.length === 0) {
				this.status = ChapterPageStatus.FAILED;
				this.error = `Failed to get upload session file ID: Invalid response format`;
				this.progress = 0;
				return;
			}

			const firstResponse = data[0];

			if (!firstResponse.id || typeof firstResponse.id !== 'string') {
				this.status = ChapterPageStatus.FAILED;
				this.error = `Failed to get upload session file ID: Invalid response format`;
				this.progress = 0;
				return;
			}

			this.associatedUploadSessionFileId = firstResponse.id;
			this.status = ChapterPageStatus.UPLOADED;
			this.progress = 1;
			this.error = null;
		} catch (error) {
			this.status = ChapterPageStatus.FAILED;
			this.progress = 0;

			if (axios.isAxiosError(error)) {
				this.error =
					error.response?.data?.message ||
					error.message ||
					`Network error: ${error.response?.statusText || 'Unknown error'}`;
			} else if (error instanceof Error) {
				this.error = error.message;
			} else {
				this.error = 'Unknown error occurred during upload';
			}
		}
	}

	public static async uploadBatchToSession(
		pages: ChapterPageState[],
		sessionId: string,
		authToken: string
	): Promise<void> {
		if (pages.length === 0) {
			return;
		}

		// Set all pages to uploading status
		for (const page of pages) {
			page.status = ChapterPageStatus.UPLOADING;
			page.progress = 0;
			page.error = null;
		}

		const formData = new FormData();
		for (const page of pages) {
			formData.append('file', page.pageFile);
		}

		const onUploadProgress = (progressEvent: AxiosProgressEvent) => {
			const overallProgress = Number(progressEvent.progress?.toFixed(2) ?? 0);
			// Distribute progress evenly across all pages in the batch
			for (const page of pages) {
				page.progress = overallProgress;
			}
		};

		try {
			const response = await RATE_LIMITER_UPLOAD.makeRequest(() =>
				axios.post(`https://api.weebdex.org/upload/${sessionId}`, formData, {
					headers: {
						Authorization: `Bearer ${authToken}`
					},
					onUploadProgress: onUploadProgress
				})
			);

			const data = response.data;

			// API returns an array of responses, one for each file
			if (!Array.isArray(data) || data.length !== pages.length) {
				const errorMsg = `Failed to upload batch: Expected ${pages.length} responses, got ${Array.isArray(data) ? data.length : 'invalid format'}`;
				for (const page of pages) {
					page.status = ChapterPageStatus.FAILED;
					page.error = errorMsg;
					page.progress = 0;
				}
				return;
			}

			// Map response IDs back to pages
			for (let i = 0; i < pages.length; i++) {
				const responseItem = data[i];
				if (!responseItem.id || typeof responseItem.id !== 'string') {
					pages[i].status = ChapterPageStatus.FAILED;
					pages[i].error = `Failed to get upload session file ID: Invalid response format`;
					pages[i].progress = 0;
				} else {
					pages[i].associatedUploadSessionFileId = responseItem.id;
					pages[i].status = ChapterPageStatus.UPLOADED;
					pages[i].progress = 1;
					pages[i].error = null;
				}
			}
		} catch (error) {
			for (const page of pages) {
				page.status = ChapterPageStatus.FAILED;
				page.progress = 0;

				if (axios.isAxiosError(error)) {
					page.error =
						error.response?.data?.message ||
						error.message ||
						`Network error: ${error.response?.statusText || 'Unknown error'}`;
				} else if (error instanceof Error) {
					page.error = error.message;
				} else {
					page.error = 'Unknown error occurred during upload';
				}
			}
		}
	}
}

export enum ChapterStatus {
	NOT_STARTED = 'NOT_STARTED',
	WAITING = 'WAITING',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED'
}

export class ChapterState {
	public originalFolderName = $state<string | null>(null);
	public chapterTitle = $state<string | null>(null);
	public chapterVolume = $state<number | null>(null);
	public chapterNumber = $state<number | null>(null);

	public associatedSeries = $state<ChapterUploadingSeries | null>(null);
	public associatedGroup = $state<ChapterUploadingGroup | null>(null);
	public pages = $state<ChapterPageState[]>([]);
	public status = $state<ChapterStatus>(ChapterStatus.NOT_STARTED);
	public progress = $state<number>(0); // 0 - 1 normalized progress
	public error = $state<string | null>(null);

	public associatedUploadSessionId = $state<string | null>(null);

	public constructor(
		originalFolderName: string | null,
		chapterTitle: string | null,
		chapterVolume: number | null,
		chapterNumber: number | null,
		associatedSeries: ChapterUploadingSeries,
		associatedGroup: ChapterUploadingGroup,
		pages: ChapterPageState[],
		status: ChapterStatus = ChapterStatus.NOT_STARTED,
		progress: number = 0,
		error: string | null = null,
		associatedUploadSessionId: string | null = null
	) {
		this.originalFolderName = originalFolderName;
		this.chapterTitle = chapterTitle;
		this.chapterVolume = chapterVolume;
		this.chapterNumber = chapterNumber;
		this.associatedSeries = associatedSeries;
		this.associatedGroup = associatedGroup;
		this.pages = pages;
		this.status = status;
		this.progress = progress;
		this.error = error;
		this.associatedUploadSessionId = associatedUploadSessionId;
	}

	public checkProgress(): void {
		const totalPages = this.pages.length;
		if (totalPages === 0) {
			this.progress = 0;
			return;
		}
		const progressTotal = this.pages.reduce((acc, page) => acc + page.progress, 0);
		this.progress = progressTotal / totalPages;
	}

	public async upload(token: string): Promise<void> {
		this.status = ChapterStatus.IN_PROGRESS;
		this.progress = 0;
		this.error = null;

		if (!this.associatedGroup || !this.associatedSeries) {
			this.status = ChapterStatus.FAILED;
			this.error = 'No associated group or series';
			this.progress = 0;
			return;
		}

		if (this.pages.length === 0) {
			this.status = ChapterStatus.FAILED;
			this.error = 'No pages to upload';
			this.progress = 0;
			return;
		}

		const groupIds = this.associatedGroup.groupIds ?? [];

		const sessionRequest = {
			groups: groupIds,
			manga: this.associatedSeries.seriesId
		};

		try {
			// first we create the upload session
			const response = await RATE_LIMITER_SESSION.makeRequest(() =>
				axios.post(`https://api.weebdex.org/upload/begin`, sessionRequest, {
					headers: {
						Authorization: `Bearer ${token}`
					}
				})
			);

			const data = response.data;
			const uploadSessionId = data.id;

			if (!uploadSessionId || typeof uploadSessionId !== 'string') {
				this.status = ChapterStatus.FAILED;
				this.error = `Failed to get upload session ID: Invalid response format`;
				this.progress = 0;
				return;
			}

			this.associatedUploadSessionId = uploadSessionId;
			this.checkProgress(); // Update progress after session creation

			// now we upload the pages in batches of up to 10 per request
			// Process 3 chunks concurrently for better performance
			const BATCH_SIZE = 10;
			const CONCURRENT_CHUNKS = 3;

			const pageChunks = cluster(this.pages, BATCH_SIZE);

			// Process chunks in groups of 3 concurrently
			for (let i = 0; i < pageChunks.length; i += CONCURRENT_CHUNKS) {
				const chunkGroup = pageChunks.slice(i, i + CONCURRENT_CHUNKS);

				// Upload all chunks in this group concurrently
				await Promise.all(
					chunkGroup.map((batch) =>
						ChapterPageState.uploadBatchToSession(batch, uploadSessionId, token)
					)
				);

				// Validate none of the uploads failed across all chunks in this group
				const failedPages: ChapterPageState[] = [];
				for (const batch of chunkGroup) {
					failedPages.push(...batch.filter((page) => page.status === ChapterPageStatus.FAILED));
				}

				if (failedPages.length > 0) {
					this.status = ChapterStatus.FAILED;
					const errorMessages = failedPages
						.map((page) => page.error)
						.filter((msg): msg is string => msg !== null)
						.join('; ');
					this.error = `Failed to upload some pages: ${errorMessages}`;
					this.progress = 0;
					await this.cleanupFailedUpload(token);
					return;
				}

				this.checkProgress();
			}

			// Gather upload IDs, preserving page order
			const gatheredUploads: string[] = this.pages
				.map((page) => page.associatedUploadSessionFileId)
				.filter((id): id is string => id !== null);

			if (gatheredUploads.length !== this.pages.length) {
				this.status = ChapterStatus.FAILED;
				this.error = `Failed to upload some pages: ${this.pages.length - gatheredUploads.length} page(s) missing upload IDs`;
				this.progress = 0;
				await this.cleanupFailedUpload(token);
				return;
			}

			const finalizedUploadRequest = {
				draft: {
					chapter: this.chapterNumber?.toString() ?? '',
					volume: this.chapterVolume?.toString() ?? '',
					title: this.chapterTitle ?? '',
					language: 'en' // TODO: make this configurable
				},
				page_order: gatheredUploads
			};

			await RATE_LIMITER_SESSION.makeRequest(() =>
				axios.post(
					`https://api.weebdex.org/upload/${this.associatedUploadSessionId}/commit`,
					finalizedUploadRequest,
					{
						headers: {
							Authorization: `Bearer ${token}`
						}
					}
				)
			);

			this.status = ChapterStatus.COMPLETED;
			this.progress = 1;
			this.error = null;
		} catch (error) {
			this.status = ChapterStatus.FAILED;
			this.progress = 0;

			if (axios.isAxiosError(error)) {
				this.error =
					error.response?.data?.message ||
					error.message ||
					`Network error: ${error.response?.statusText || 'Unknown error'}`;
			} else if (error instanceof Error) {
				this.error = error.message;
			} else {
				this.error = 'Unknown error occurred during upload';
			}

			await this.cleanupFailedUpload(token);
		}
	}

	public async cleanupFailedUpload(token: string): Promise<void> {
		if (!this.associatedUploadSessionId) {
			return;
		}

		await RATE_LIMITER_SESSION.makeRequest(() =>
			axios.delete(`https://api.weebdex.org/upload/${this.associatedUploadSessionId}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			})
		);
	}
}
