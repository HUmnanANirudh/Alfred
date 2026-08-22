import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { projectService } from '../services/projectService';
import { useProjectStore } from '../store/projectStore';
import { toast } from '../store/toastStore';
import styles from './EmptyWorkspace.module.css';
import page from './page.module.css';

export function EmptyWorkspace() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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
      setModalOpen(false);
      navigate(`/projects/${project.id}`);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setCreating(false);
    }
  }

  function handleOpen() {
    setName('');
    setDescription('');
    setError('');
    setModalOpen(true);
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <FolderOpen size={40} strokeWidth={1.25} />
        </div>
        <h1 className={styles.headline}>Alfred, welcomes you</h1>
        <Button variant="primary" size="lg" onClick={handleOpen}>
          Commission a Project
        </Button>
        {projects.length > 0 && (
          <div className={page.stack} style={{ width: '100%', marginTop: 24, textAlign: 'left' }}>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={page.card}
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setActiveProject(project.id);
                  navigate(`/projects/${project.id}`);
                }}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Commission a Project"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              Create Project
            </Button>
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
    </div>
  );
}
