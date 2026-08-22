import { Textarea } from '../ui/Textarea';
import styles from './ArticleEditor.module.css';

export function ArticleEditor({
  title,
  content,
  onTitleChange,
  onChange,
}: {
  title?: string;
  content: string;
  onTitleChange?: (value: string) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.wrap}>
      {onTitleChange && (
        <input
          className={styles.title}
          value={title ?? ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
        />
      )}
      <Textarea
        className={styles.body}
        rows={18}
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
