import { useState } from 'react';
import { voiceService } from '../../services/voiceService';
import { toast } from '../../store/toastStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Job } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ProcessingPanel } from '../video/ProcessingPanel';

export function AddVoiceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const setVoices = useWorkspaceStore((s) => s.setVoices);
  const [name, setName] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await voiceService.create(name.trim(), undefined, setJob);
      setVoices(await voiceService.list());
      toast.success('Voice created');
      setName('');
      setJob(null);
      onClose();
    } catch {
      toast.error('We couldn\'t create this voice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title="Add voice"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={create} loading={busy}>Create voice</Button>
        </>
      }
    >
      <Input label="Name" placeholder="My voice" value={name} onChange={(e) => setName(e.target.value)} />
      <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        Your voice stays on this device.
      </p>
      {job && busy && (
        <div style={{ marginTop: 16 }}>
          <ProcessingPanel job={job} title="Cloning voice" />
        </div>
      )}
    </Modal>
  );
}
