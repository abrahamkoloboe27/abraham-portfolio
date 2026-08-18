import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("container-page", className)}>{children}</div>;
}

export function Section({
  id,
  className,
  muted = false,
  children,
}: {
  id?: string;
  className?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-16 sm:py-20",
        muted && "bg-[var(--color-surface-muted)]",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-[var(--color-accent)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="mt-3 text-[var(--color-ink-muted)] sm:text-lg">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type BadgeVariant = "default" | "accent" | "outline" | "success";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
    accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]",
    outline: "border border-[var(--color-border-strong)] text-[var(--color-ink-muted)]",
    success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium " +
  "transition-colors disabled:pointer-events-none disabled:opacity-60";

const buttonVariants = {
  primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
  secondary:
    "border border-[var(--color-border-strong)] text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]",
  ghost: "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  external = false,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; external?: boolean }) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  interactive = false,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card overflow-hidden",
        interactive &&
          "transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] focus-within:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-card px-6 py-12 text-center text-[var(--color-ink-muted)]">
      {message}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-[var(--color-border)]", className)} />;
}
