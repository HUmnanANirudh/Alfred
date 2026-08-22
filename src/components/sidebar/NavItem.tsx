import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './NavItem.module.css';

interface NavItemProps {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isActive?: boolean;
  isSubItem?: boolean;
  indent?: number;
}

export function NavItem({
  label,
  to,
  onClick,
  icon,
  isActive = false,
  isSubItem = false,
  indent = 0,
}: NavItemProps): React.ReactElement {
  const location = useLocation();

  // Derive active state from router if not explicitly provided
  const active = isActive || (to ? location.pathname === to : false);

  const className = [
    styles.item,
    active ? styles.active : '',
    isSubItem ? styles.subItem : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = indent > 0
    ? { paddingLeft: `calc(var(--space-3) + ${indent * 16}px)` }
    : {};

  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} style={style} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} style={style} onClick={onClick}>
      {content}
    </button>
  );
}
