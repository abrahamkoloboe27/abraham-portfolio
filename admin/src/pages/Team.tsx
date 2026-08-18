import { Copy, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Panel,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  useDeleteTeamMember,
  useInvitations,
  useInvite,
  useRevokeInvitation,
  useTeam,
  useUpdateTeamMember,
} from "@/lib/queries";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_LEVEL, type Role, type User } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/utils";

const ASSIGNABLE: Role[] = ["admin", "editor", "viewer"];

export function Team() {
  const { user, can } = useAuth();
  const canManage = can("admin");
  const isOwner = user?.role === "owner";

  const { data: team, isLoading } = useTeam();
  const { data: invitations } = useInvitations();
  const invite = useInvite();
  const revoke = useRevokeInvitation();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [message, setMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  if (!canManage) {
    return (
      <Panel>
        <EmptyState
          title="Accès restreint"
          description="Seuls les administrateurs et le propriétaire peuvent gérer les accès."
        />
      </Panel>
    );
  }

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    const created = await invite.mutateAsync({ email: email.trim(), role, message: message || undefined });
    setEmail("");
    setMessage("");
    // Without SMTP configured, the API returns the link once so it can be shared manually.
    if (created.invite_url) {
      setInviteUrl(created.invite_url);
    } else {
      setInviting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Accès & invitations"
        description="Partagez la gestion du site sans partager votre mot de passe."
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="size-4" />
            Inviter
          </Button>
        }
      />

      <Panel className="mb-6 overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="font-semibold">Membres</h2>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {(team?.items ?? []).map((member) => {
              const isSelf = member.id === user?.id;
              const protectedRow = member.role === "owner" && !isOwner;

              return (
                <li key={member.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand-ink)]">
                    {member.full_name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {member.full_name}
                      {isSelf ? <Badge tone="brand">Vous</Badge> : null}
                      {member.role === "owner" ? (
                        <Badge tone="success">
                          <ShieldCheck className="size-3" aria-hidden />
                          Propriétaire
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-[var(--color-ink-muted)]">
                      {member.email}
                    </p>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      Dernière connexion : {relativeTime(member.last_login_at)}
                    </p>
                  </div>

                  <Select
                    className="max-w-40"
                    value={member.role}
                    disabled={protectedRow || isSelf || updateMember.isPending}
                    onChange={(event) =>
                      updateMember.mutate({
                        id: member.id,
                        payload: { role: event.target.value },
                      })
                    }
                  >
                    {member.role === "owner" ? (
                      <option value="owner">{ROLE_LABELS.owner}</option>
                    ) : null}
                    {ASSIGNABLE.filter(
                      (value) => ROLE_LEVEL[value] <= ROLE_LEVEL[user?.role ?? "viewer"],
                    ).map((value) => (
                      <option key={value} value={value}>
                        {ROLE_LABELS[value]}
                      </option>
                    ))}
                  </Select>

                  <Switch
                    checked={member.is_active}
                    disabled={protectedRow || isSelf}
                    label="Actif"
                    onChange={(next) =>
                      updateMember.mutate({ id: member.id, payload: { is_active: next } })
                    }
                  />

                  {isOwner && !isSelf ? (
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      aria-label="Révoquer"
                      onClick={() => setDeleting(member)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="font-semibold">Invitations</h2>
        </div>

        {invitations?.length ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {invitations.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Mail className="size-4 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.email}</p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {ROLE_LABELS[item.role]} · expire le {formatDate(item.expires_at)}
                  </p>
                </div>
                <Badge
                  tone={
                    item.status === "accepted"
                      ? "success"
                      : item.status === "revoked"
                        ? "danger"
                        : "warning"
                  }
                >
                  {item.status === "accepted"
                    ? "Acceptée"
                    : item.status === "revoked"
                      ? "Révoquée"
                      : "En attente"}
                </Badge>
                {item.status === "pending" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={revoke.isPending}
                    onClick={() => revoke.mutate(item.id)}
                  >
                    Révoquer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Aucune invitation"
            description="Invitez un collaborateur pour lui donner accès à l'administration."
          />
        )}
      </Panel>

      <Modal
        open={inviting}
        onClose={() => {
          setInviting(false);
          setInviteUrl(null);
        }}
        title="Inviter un collaborateur"
        description="Un email contenant un lien d'activation lui sera envoyé."
      >
        {inviteUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--color-ink-muted)]">
              L&apos;envoi d&apos;email n&apos;est pas configuré. Transmettez ce lien manuellement —
              il ne sera plus affiché ensuite.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} onFocus={(event) => event.target.select()} />
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success("Lien copié");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setInviteUrl(null);
                setInviting(false);
              }}
            >
              Terminé
            </Button>
          </div>
        ) : (
          <form onSubmit={submitInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Adresse email
              </label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium">
                Rôle
              </label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                {ASSIGNABLE.filter(
                  (value) => ROLE_LEVEL[value] <= ROLE_LEVEL[user?.role ?? "viewer"],
                ).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-[var(--color-ink-subtle)]">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-message" className="text-sm font-medium">
                Message (optionnel)
              </label>
              <Textarea
                id="invite-message"
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setInviting(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={invite.isPending}>
                Envoyer l&apos;invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Révoquer cet accès"
        message={`${deleting?.full_name} perdra immédiatement l'accès à l'administration.`}
        confirmLabel="Révoquer"
        loading={deleteMember.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteMember.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
