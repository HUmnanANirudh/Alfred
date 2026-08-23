import { useState } from 'react';
import { voiceService } from '../../services/voiceService';
import { toast } from '../../store/toastStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export function AddVoiceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const setVoices = useWorkspaceStore((s) => s.setVoices);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await voiceService.create(name.trim(), undefined, undefined);
      setVoices(await voiceService.list());
      toast.success('Voice created');
      setName('');
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
      title="Add TTS Voice"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={create} loading={busy}>Add Voice</Button>
        </>
      }
    >
      <Input label="Name" placeholder="My new voice" value={name} onChange={(e) => setName(e.target.value)} />
    </Modal>
  );
}
