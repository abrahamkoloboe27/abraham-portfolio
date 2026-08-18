import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button, Input, LoadingBlock, Panel } from "@/components/ui";
import { ApiError, http, tokens } from "@/lib/api";
import { ROLE_LABELS, type Invitation, type Role, type TokenPair } from "@/lib/types";

export function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation incomplet.");
      setChecking(false);
      return;
    }
    http
      .public<Invitation>(
        `/admin/team/invitations/verify?token=${encodeURIComponent(token)}`,
        undefined,
        "GET",
      )
      .then(setInvitation)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Invitation invalide."),
      )
      .finally(() => setChecking(false));
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const pair = await http.public<TokenPair>("/admin/team/invitations/accept", {
        token,
        full_name: fullName.trim(),
        password,
      });
      tokens.set(pair.access_token, pair.refresh_token);
      // Full reload so the auth provider picks up the fresh session cleanly.
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Activation impossible.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-full place-items-center">
        <LoadingBlock label="Vérification de l'invitation…" />
      </div>
    );
  }

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Panel className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-lg font-semibold">Activer votre accès</h1>

        {invitation ? (
          <>
            <p className="mb-6 text-sm text-[var(--color-ink-muted)]">
              Vous rejoignez l&apos;administration en tant que{" "}
              <strong>{ROLE_LABELS[invitation.role as Role]}</strong> avec l&apos;adresse{" "}
              <strong>{invitation.email}</strong>.
            </p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="full_name" className="text-sm font-medium">
                  Nom complet
                </label>
                <Input
                  id="full_name"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
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
                  minLength={10}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-[var(--color-ink-subtle)]">10 caractères minimum.</p>
              </div>

              {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

              <Button type="submit" loading={loading} className="w-full">
                Créer mon compte
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => navigate("/login")}
            >
              Aller à la connexion
            </Button>
          </>
        )}

        <div className="mt-5 text-center">
          <Link to="/login" className="text-sm text-[var(--color-ink-muted)] hover:underline">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </Panel>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await http.public("/admin/auth/password-reset/confirm", {
        token,
        new_password: password,
      });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Réinitialisation impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Panel className="w-full max-w-sm p-8">
        <h1 className="mb-4 text-lg font-semibold">Nouveau mot de passe</h1>
        {done ? (
          <>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Mot de passe mis à jour. Vous pouvez vous connecter.
            </p>
            <Button className="mt-5 w-full" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            <Button type="submit" loading={loading} className="w-full">
              Réinitialiser
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
