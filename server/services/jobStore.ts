export type ProcessingStageStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Analyzed'
  | 'Completed'
  | 'Needs attention'
  | 'Failed';

export interface BackgroundJob {
  id: string;
  title: string;
  kind: 'gmail' | 'whatsapp' | 'image' | 'audio' | 'video' | 'document';
  status: ProcessingStageStatus;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
}

const jobs = new Map<string, BackgroundJob>();

export function createJob(title: string, kind: BackgroundJob['kind']): BackgroundJob {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const job: BackgroundJob = {
    id,
    title,
    kind,
    status: 'Uploaded',
    progress: 5,
    message: 'Uploaded and queued for processing...',
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);
  return job;
}

export function updateJob(
  id: string,
  patch: Partial<Pick<BackgroundJob, 'status' | 'progress' | 'message' | 'result' | 'error'>>
) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export function getJob(id: string): BackgroundJob | undefined {
  return jobs.get(id);
}

export function listJobs(): BackgroundJob[] {
  return Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
}
