import './Badge.css';

function Badge({ variant = 'default', size = 'md', children }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  );
}

export default Badge;
