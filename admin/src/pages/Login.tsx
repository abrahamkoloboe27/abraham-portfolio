import { LogIn, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button, Input, Panel } from "@/components/ui";
import { ApiError, http } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Connexion impossible. Réessayez.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Panel className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-xl bg-[var(--color-brand)] text-sm font-bold text-white"
          >
            AK
          </span>
          <div>
            <h1 className="text-lg font-semibold">Administration</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Portfolio d&apos;Abraham Z. KOLOBOE
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={loading} className="w-full">
            <LogIn className="size-4" />
            Se connecter
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--color-ink-muted)] underline-offset-2 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </Panel>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    // The endpoint answers identically whether or not the account exists.
    await http
      .public("/admin/auth/password-reset", { email: email.trim() })
      .catch(() => undefined);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Panel className="w-full max-w-sm p-8">
        <h1 className="mb-2 text-lg font-semibold">Mot de passe oublié</h1>
        {sent ? (
          <>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Si un compte existe pour cette adresse, un lien de réinitialisation vient d&apos;être
              envoyé.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block text-sm text-[var(--color-brand)] hover:underline"
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-[var(--color-ink-muted)]">
              Saisissez votre adresse, nous vous enverrons un lien de réinitialisation.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Input
                type="email"
                required
                placeholder="vous@exemple.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" loading={loading} className="w-full">
                Envoyer le lien
              </Button>
              <Link
                to="/login"
                className="text-center text-sm text-[var(--color-ink-muted)] hover:underline"
              >
                Retour
              </Link>
            </form>
          </>
        )}
      </Panel>
    </div>
  );
}
