import { Archive, Mail, MailOpen, Reply, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  Modal,
  PageHeader,
  Panel,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useDeleteMessage, useMessages, useUpdateMessage } from "@/lib/queries";
import type { ContactMessage } from "@/lib/types";
import { cn, formatDate, relativeTime } from "@/lib/utils";

const FILTERS = [
  { key: "inbox", label: "Boîte de réception", params: { archived: false, spam: false } },
  { key: "unread", label: "Non lus", params: { archived: false, spam: false, unread: true } },
  { key: "archived", label: "Archivés", params: { archived: true, spam: false } },
  { key: "spam", label: "Spam", params: { archived: false, spam: true } },
] as const;

export function Messages() {
  const { can } = useAuth();
  const canEdit = can("editor");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("inbox");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState("");

  const active = FILTERS.find((item) => item.key === filter)!;
  const { data, isLoading } = useMessages(active.params);
  const update = useUpdateMessage();
  const remove = useDeleteMessage();

  function open(message: ContactMessage) {
    setSelected(message);
    setNotes(message.notes ?? "");
    if (!message.is_read && canEdit) {
      update.mutate({ id: message.id, payload: { is_read: true } });
    }
  }

  return (
    <>
      <PageHeader title="Messages" description="Demandes reçues via le formulaire de contact." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === item.key
                ? "border-transparent bg-[var(--color-brand)] text-white"
                : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : data?.items.length ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {data.items.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => open(message)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-panel-alt)]"
                >
                  <span className="mt-0.5 text-[var(--color-ink-subtle)]">
                    {message.is_read ? (
                      <MailOpen className="size-4" aria-hidden />
                    ) : (
                      <Mail className="size-4 text-[var(--color-brand)]" aria-hidden />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", !message.is_read && "font-semibold")}>
                        {message.name}
                      </span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">
                        {message.email}
                      </span>
                      {message.company ? (
                        <Badge tone="neutral">{message.company}</Badge>
                      ) : null}
                      {message.is_spam ? <Badge tone="danger">Spam</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                      {message.subject ? `${message.subject} — ` : ""}
                      {message.message}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">
                    {relativeTime(message.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucun message" description="Rien à afficher dans ce dossier." />
        )}
      </Panel>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.subject ?? "Message"}
        description={selected ? `${selected.name} · ${selected.email}` : undefined}
        footer={
          selected && canEdit ? (
            <>
              <Button
                variant="dangerGhost"
                size="sm"
                onClick={() => {
                  setDeleting(selected);
                  setSelected(null);
                }}
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await update.mutateAsync({
                    id: selected.id,
                    payload: { is_spam: !selected.is_spam },
                  });
                  setSelected(null);
                }}
              >
                <ShieldAlert className="size-3.5" />
                {selected.is_spam ? "Pas un spam" : "Marquer comme spam"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await update.mutateAsync({
                    id: selected.id,
                    payload: { is_archived: !selected.is_archived, notes },
                  });
                  setSelected(null);
                }}
              >
                <Archive className="size-3.5" />
                {selected.is_archived ? "Désarchiver" : "Archiver"}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await update.mutateAsync({
                    id: selected.id,
                    payload: { replied_at: new Date().toISOString(), notes },
                  });
                  window.location.href = `mailto:${selected.email}?subject=${encodeURIComponent(
                    `Re: ${selected.subject ?? "Votre message"}`,
                  )}`;
                }}
              >
                <Reply className="size-3.5" />
                Répondre
              </Button>
            </>
          ) : undefined
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-3 text-xs text-[var(--color-ink-subtle)]">
              <span>Reçu le {formatDate(selected.created_at, true)}</span>
              <span>Langue : {selected.locale.toUpperCase()}</span>
              {selected.referrer ? <span>Source : {selected.referrer}</span> : null}
              {selected.replied_at ? (
                <Badge tone="success">Répondu {relativeTime(selected.replied_at)}</Badge>
              ) : null}
            </div>

            <p className="text-sm whitespace-pre-wrap">{selected.message}</p>

            {canEdit ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes internes
                </label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  placeholder="Contexte, suite à donner…"
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer ce message"
        message="Le message sera définitivement supprimé."
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
