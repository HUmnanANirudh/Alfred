import type { Job, JobStep, JobType } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';

export type JobProgressHandler = (job: Job) => void;

export async function runJob(
  type: JobType,
  stepDefs: Array<{ label: string; ms: number; engine?: string }>,
  options: { projectId?: string; onProgress?: JobProgressHandler } = {},
): Promise<Job> {
  const job: Job = {
    id: generateId('job'),
    type,
    status: 'running',
    projectId: options.projectId,
    steps: stepDefs.map((s): JobStep => ({
      id: generateId('stp'),
      label: s.label,
      status: 'pending',
      engine: s.engine,
    })),
    createdAt: now(),
    updatedAt: now(),
  };

  const emit = () => {
    const snapshot: Job = { ...job, steps: job.steps.map((s) => ({ ...s })), updatedAt: now() };
    options.onProgress?.(snapshot);
  };

  emit();

  for (let i = 0; i < job.steps.length; i++) {
    const step = job.steps[i];
    if (!step) continue;
    step.status = 'running';
    job.updatedAt = now();
    emit();
    await delay(stepDefs[i]?.ms ?? 1200);
    step.status = 'done';
    job.updatedAt = now();
    emit();
  }

  job.status = 'done';
  job.updatedAt = now();
  emit();
  return { ...job, steps: job.steps.map((s) => ({ ...s })) };
}
