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
}
