"use client";

import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";
type Errors = Partial<Record<"name" | "email" | "message", string>>;

const inputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 " +
  "text-sm outline-none transition-colors placeholder:text-[var(--color-ink-subtle)] " +
  "focus:border-[var(--color-accent)]";

export function ContactForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [feedback, setFeedback] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      company: String(data.get("company") ?? "").trim() || undefined,
      subject: String(data.get("subject") ?? "").trim() || undefined,
      message: String(data.get("message") ?? "").trim(),
      // Hidden field: real visitors leave it empty.
      honeypot: String(data.get("website") ?? ""),
      locale,
    };

    const nextErrors: Errors = {};
    if (payload.name.length < 2) nextErrors.name = t("contact.required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
      nextErrors.email = t("contact.invalidEmail");
    if (payload.message.length < 10) nextErrors.message = t("contact.tooShort");

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus("sending");
    try {
      const response = await api.sendContact(payload);
      setFeedback(response.detail ?? t("contact.success"));
      setStatus("sent");
      form.reset();
    } catch {
      setFeedback(t("contact.error"));
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="surface-card flex items-start gap-3 p-6 text-[var(--color-ink-muted)]"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
        <div>
          <p className="font-medium text-[var(--color-ink)]">{feedback}</p>
          <Button variant="ghost" className="mt-3 px-0" onClick={() => setStatus("idle")}>
            {t("contact.send")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("contact.name")} error={errors.name} htmlFor="name" required>
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
        </Field>
        <Field label={t("contact.email")} error={errors.email} htmlFor="email" required>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("contact.company")} htmlFor="company">
          <input id="company" name="company" autoComplete="organization" className={inputClass} />
        </Field>
        <Field label={t("contact.subject")} htmlFor="subject">
          <input id="subject" name="subject" className={inputClass} />
        </Field>
      </div>

      <Field label={t("contact.message")} error={errors.message} htmlFor="message" required>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={cn(inputClass, "resize-y")}
        />
      </Field>

      {/* Honeypot — hidden from humans and assistive tech, filled in by most bots. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {feedback}
        </p>
      ) : null}

      <Button type="submit" disabled={status === "sending"} className="w-fit">
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("contact.sending")}
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden />
            {t("contact.send")}
          </>
        )}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-accent)]">*</span> : null}
      </label>
      {children}
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
