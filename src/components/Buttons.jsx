import { Link } from "react-router-dom";
import { ArrowRightIcon, ArrowUpRightIcon, UserRoundIcon } from "./Icons";
import "../css/Buttons.css";

export function Button({
  variant,
  children,
  onClick,
  type = "button",
  to,
  disabled = false,
  icon,
}) {
  const className = `rio-button rio-button--${variant}`;
  const showUserIcon = icon ?? variant === "login";
  const content = (
    <>
      {showUserIcon && <UserRoundIcon />}
      {children}
      {variant === "hero" && (
        <span className="rio-button__icon rio-button__icon--hero">
          <ArrowUpRightIcon size={17} color="#0B0B11" />
        </span>
      )}
      {variant === "ticket" && (
        <span className="rio-button__icon rio-button__icon--ticket">
          <ArrowUpRightIcon />
        </span>
      )}
      {variant === "reserve" && (
        <span className="rio-button__icon rio-button__icon--reserve">
          <ArrowRightIcon />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
