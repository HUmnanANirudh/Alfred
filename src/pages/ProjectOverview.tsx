import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { projectService } from '../services/projectService';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate } from '../utils/format';
import { useEffect } from 'react';
import styles from './page.module.css';

export function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useProjectStore((s) => s.updateProject);
  const sources = useWorkspaceStore((s) => s.sources);
  const shorts = useWorkspaceStore((s) => s.shorts);
  const audio = useWorkspaceStore((s) => s.audio);
  const writing = useWorkspaceStore((s) => s.writing);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    projectService.get(id).then((p) => { if (p) updateProject(p); });
  }, [id, sources.length, shorts.length, audio.length, writing.length, updateProject]);

  if (!project) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>We couldn&apos;t find that project.</p>
      </div>
    );
  }

  const recent = [
    ...sources.slice(0, 3).map((s) => ({ id: s.id, label: s.title, when: s.createdAt, kind: 'Source' })),
    ...writing.slice(0, 2).map((w) => ({ id: w.id, label: w.title ?? w.type, when: w.createdAt, kind: 'Draft' })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 5);

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <Button variant="secondary" onClick={() => navigate(`/projects/${id}/video`)}>Generate video</Button>
        <Button variant="secondary" onClick={() => navigate(`/projects/${id}/audio`)}>Generate audio</Button>
        <Button variant="secondary" onClick={() => navigate(`/projects/${id}/writing/article`)}>Write article</Button>
      </div>
      {recent.length === 0 ? null : (
        <ul className={styles.stack}>
          {recent.map((item) => (
            <li key={item.id} className={styles.card}>
              <span className={styles.muted}>{item.kind}</span>
              <div>{item.label}</div>
              <span className={styles.muted}>{formatDate(item.when)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
