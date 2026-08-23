import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { modelService } from '../services/modelService';
import { toast } from '../store/toastStore';
import type { AIModel, StorageUsage } from '../types';
import styles from './page.module.css';

function formatBytes(n: number) {
  if (n < 1_000_000) return `${Math.round(n / 1024)} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${(n / 1_000_000_000).toFixed(1)} GB`;
}

function statusLabel(status: AIModel['status']) {
  if (status === 'not_installed') return 'Not installed';
  if (status === 'downloading') return 'Downloading';
  if (status === 'installed' || status === 'ready') return 'Installed';
  return status;
}

export function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [list, storage] = await Promise.all([
      modelService.list(),
      modelService.getStorageUsage(),
    ]);
    setModels(list);
    setUsage(storage);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function install(id: string) {
    setBusyId(id);
    try {
      const job = await modelService.install(id);
      if (job && job.status === 'error') {
        toast.error(job.error || 'Failed to install model');
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.toString() || 'Failed to install model');
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function uninstall(id: string) {
    setBusyId(id);
    try {
      await modelService.uninstall(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Models" />
      <div className={styles.stack}>
      {usage && (
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{formatBytes(usage.models)}</div>
            <div className={styles.statLabel}>Models</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{formatBytes(usage.projects)}</div>
            <div className={styles.statLabel}>Projects</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{formatBytes(usage.exports)}</div>
            <div className={styles.statLabel}>Exports</div>
          </div>
        </div>
      )}
      {models.length === 0 ? (
        <EmptyState icon={<Cpu size={40} strokeWidth={1.25} />} title="No models in the registry" />
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Engine</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const installed = model.status === 'installed' || model.status === 'ready';
              return (
                <tr key={model.id}>
                  <td>
                    <span className={styles.tableLink}>{model.displayName}</span>
                    {model.isDefault && <Badge variant="accent">Default</Badge>}
                  </td>
                  <td>{model.role}</td>
                  <td>{model.engine === 'llama_cpp' ? 'llama.cpp' : 'audio.cpp'}</td>
                  <td>{statusLabel(model.status)}</td>
                  <td>
                    {installed ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === model.id}
                        onClick={() => void uninstall(model.id)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busyId === model.id}
                        onClick={() => void install(model.id)}
                      >
                        Install
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}
