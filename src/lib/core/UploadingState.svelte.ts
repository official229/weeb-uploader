import axios, { type AxiosProgressEvent } from 'axios';
import { sleep } from './Utils';

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
			const response = await axios.post(`https://api.weebdex.org/upload/${sessionId}`, formData, {
				headers: {
					Authorization: `Bearer ${authToken}`,
					Origin: 'https://weebdex.org',
					Referer: 'https://weebdex.org'
					// Note: Don't set Content-Type for FormData - let axios set it with boundary
				},
				onUploadProgress: onUploadProgress
			});

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
			const response = await axios.post(`https://api.weebdex.org/upload/begin`, sessionRequest, {
				headers: {
					Authorization: `Bearer ${token}`,
					Origin: 'https://weebdex.org',
					Referer: 'https://weebdex.org'
				}
			});

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

			// now we upload the pages in batches of 3
			// Rate limit: 18 requests per minute = 1 request every 3.33 seconds
			// With batches of 3, we need to wait ~10 seconds between batches to stay under the limit
			const RATE_LIMIT_DELAY_MS = 5000; // 5 seconds to stay safely under 18 req/min

			for (let i = 0; i < this.pages.length; i += 3) {
				const batch = this.pages.slice(i, i + 3);
				await Promise.all(batch.map((page) => page.uploadToSession(uploadSessionId, token)));

				// validate none of the uploads failed
				const failedPages = batch.filter((page) => page.status === ChapterPageStatus.FAILED);
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

				// Don't wait after the last batch
				if (i + 3 < this.pages.length) {
					await sleep(RATE_LIMIT_DELAY_MS);
				}
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

			await axios.post(
				`https://api.weebdex.org/upload/${this.associatedUploadSessionId}/commit`,
				finalizedUploadRequest,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Origin: 'https://weebdex.org/',
						Referer: 'https://weebdex.org/'
					}
				}
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

		await axios.delete(`https://api.weebdex.org/upload/${this.associatedUploadSessionId}`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
	}
}
