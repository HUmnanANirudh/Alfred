import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { useProjectStore } from '../../store/projectStore';
import { toast } from '../../store/toastStore';
import { useUiStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import styles from '../../pages/EmptyWorkspace.module.css';

export function CreateProjectModal() {
  const open = useUiStore((s) => s.createProjectOpen);
  const setOpen = useUiStore((s) => s.setCreateProjectOpen);
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function close() {
    if (creating) return;
    setOpen(false);
    setName('');
    setDescription('');
    setError('');
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Give your project a name.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const project = await projectService.create(name.trim(), description.trim() || undefined);
      addProject(project);
      setActiveProject(project.id);
      toast.success('Project created');
      setOpen(false);
      setName('');
      setDescription('');
      navigate(`/projects/${project.id}`);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Commission a Project"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={creating}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={creating}>Create Project</Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          label="Project name"
          placeholder="The Future of AI"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          error={error}
        />
        <Textarea
          label="Description"
          placeholder="Research and content around AI agents. (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}
