import './Card.css';

function Card({ children, className = '', padding = 'md', shadow = true, ...props }) {
  return (
    <div
      className={`card-base card card--pad-${padding} ${shadow ? 'card--shadow' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`card__header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card__footer ${className}`}>{children}</div>;
}

export default Card;
