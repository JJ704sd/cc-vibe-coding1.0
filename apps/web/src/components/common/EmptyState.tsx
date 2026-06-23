import type { ReactNode } from 'react';

export type EmptyStateVariant = 'no-projects' | 'no-media' | 'no-routes' | 'no-results';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  cta?: ReactNode;
  icon?: ReactNode;
  className?: string;
  testId?: string;
}

function NoProjectsIcon() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="14" y="22" width="68" height="52" rx="10" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M14 34 L48 14 L82 34" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="32" y="48" width="20" height="14" rx="2" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="60" cy="62" r="3" fill="currentColor" fillOpacity="0.3" />
      <circle cx="78" cy="20" r="1.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="82" cy="14" r="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function NoMediaIcon() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="10" y="22" width="62" height="50" rx="6" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="34" y="34" width="52" height="40" rx="6" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="52" cy="48" r="5" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M38 70 L50 58 L62 70" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="78" cy="20" r="1.5" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

function NoRoutesIcon() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 76 C 28 60, 28 40, 48 32 S 76 24, 80 16"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="76" r="5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <circle cx="80" cy="16" r="5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="76" r="2" fill="currentColor" fillOpacity="0.5" />
      <circle cx="80" cy="16" r="2" fill="currentColor" fillOpacity="0.5" />
      <path d="M62 28 L70 22 L68 32 Z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function NoResultsIcon() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="42" cy="42" r="22" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
      <path d="M58 58 L78 78" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 42 L42 32 L52 42 L42 52 Z" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

const variantIcons: Record<EmptyStateVariant, () => ReactNode> = {
  'no-projects': NoProjectsIcon,
  'no-media': NoMediaIcon,
  'no-routes': NoRoutesIcon,
  'no-results': NoResultsIcon,
};

export function EmptyState({
  variant = 'no-results',
  title,
  description,
  cta,
  icon,
  className,
  testId = 'empty-state',
}: EmptyStateProps) {
  const Icon = variantIcons[variant];
  return (
    <div
      data-testid={testId}
      data-variant={variant}
      role="status"
      aria-live="polite"
      className={['empty-state', 'glass', className].filter(Boolean).join(' ')}
      style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 28px' }}
    >
      <div
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: 'var(--text-secondary)',
          opacity: 0.85,
        }}
      >
        {icon ?? <Icon />}
      </div>
      <h3
        className="section-title-sm"
        style={{ marginBottom: description ? '10px' : '0' }}
      >
        {title}
      </h3>
      {description ? (
        <p className="muted" style={{ fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
          {description}
        </p>
      ) : null}
      {cta ? <div style={{ marginTop: '20px' }}>{cta}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  message?: string;
  cta?: ReactNode;
  testId?: string;
}

export function ErrorState({ title, message, cta, testId = 'error-state' }: ErrorStateProps) {
  return (
    <div
      data-testid={testId}
      role="alert"
      className="empty-state glass"
      style={{
        maxWidth: '520px',
        margin: '0 auto',
        padding: '40px 28px',
        borderColor: 'var(--danger)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: 'var(--danger)',
        }}
      >
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="36" cy="36" r="28" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.8" />
          <path
            d="M36 22 L36 42"
            stroke="currentColor"
            strokeOpacity="0.8"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="36" cy="50" r="2.4" fill="currentColor" fillOpacity="0.8" />
        </svg>
      </div>
      <h3 className="section-title-sm" style={{ marginBottom: message ? '10px' : '0' }}>
        {title}
      </h3>
      {message ? (
        <p className="muted" style={{ fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      ) : null}
      {cta ? <div style={{ marginTop: '20px' }}>{cta}</div> : null}
    </div>
  );
}
