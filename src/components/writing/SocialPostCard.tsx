import type { SocialPost } from '../../types';
import { Button } from '../ui/Button';
import styles from './SocialPostCard.module.css';

export function SocialPostCard({
  post,
  onChange,
}: {
  post: SocialPost;
  onChange: (content: string) => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(post.content);
    } catch {
      /* ignore */
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.index}>{post.index}</span>
        <Button variant="ghost" size="sm" onClick={copy}>Copy</Button>
      </div>
      <textarea
        className={styles.area}
        rows={4}
        value={post.content}
        onChange={(e) => onChange(e.target.value)}
      />
    </article>
  );
}
