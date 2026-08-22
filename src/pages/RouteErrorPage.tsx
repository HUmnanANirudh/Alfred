import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import styles from './page.module.css';

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div className={styles.page}>
      <h1 className={styles.statValue} style={{ fontSize: 20 }}>Alfred hit a snag</h1>
      <p className={styles.muted} style={{ marginTop: 8, marginBottom: 16 }}>{message}</p>
      <Button variant="primary" onClick={() => navigate('/')}>Back to workspace</Button>
    </div>
  );
}
