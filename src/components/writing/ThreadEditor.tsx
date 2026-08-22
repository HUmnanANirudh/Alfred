import type { SocialPost } from '../../types';
import { SocialPostCard } from './SocialPostCard';
import styles from './ThreadEditor.module.css';

export function ThreadEditor({
  posts,
  onChange,
}: {
  posts: SocialPost[];
  onChange: (post: SocialPost) => void;
}) {
  return (
    <div className={styles.list}>
      {posts.map((post) => (
        <SocialPostCard
          key={post.id}
          post={post}
          onChange={(content) => onChange({ ...post, content })}
        />
      ))}
    </div>
  );
}
