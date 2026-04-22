import './Button.css';

function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  icon,
  children,
  disabled,
  type = 'button',
  onClick,
  ...rest
}) {
  const classes = [
    'btn-base',
    'button',
    `button--${variant}`,
    `button--${size}`,
    iconOnly && 'button--icon-only',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} {...rest}>
      {icon && <span className="button__icon">{icon}</span>}
      {!iconOnly && <span className="button__label">{children}</span>}
    </button>
  );
}

export default Button;
