import { useState } from "react";

import {
  Badge,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { useAuditLog } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

const ACTIONS = [
  { value: "create", label: "Création" },
  { value: "update", label: "Modification" },
  { value: "delete", label: "Suppression" },
  { value: "login", label: "Connexion" },
  { value: "logout", label: "Déconnexion" },
  { value: "invite", label: "Invitation" },
  { value: "reorder", label: "Réordonnancement" },
  { value: "upload", label: "Téléversement" },
];

const TONES: Record<string, "success" | "warning" | "danger" | "brand" | "neutral"> = {
  create: "success",
  update: "warning",
  delete: "danger",
  login: "brand",
  invite: "brand",
};

export function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const { data, isLoading } = useAuditLog({ page, action: action || undefined });

  return (
    <>
      <PageHeader
        title="Journal d'activité"
        description="Toutes les actions effectuées depuis l'administration."
      />

      <div className="mb-4">
        <Select
          className="max-w-56"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel-alt)] text-left">
                <tr>
                  {["Date", "Auteur", "Action", "Élément", "IP"].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2.5 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--color-ink-muted)]">
                      {formatDate(entry.created_at, true)}
                    </td>
                    <td className="px-4 py-3">{entry.actor_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TONES[entry.action] ?? "neutral"}>{entry.action}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--color-ink-muted)]">{entry.entity_type}</span>
                      {entry.entity_label ? (
                        <span className="ml-1.5 font-medium">{entry.entity_label}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-ink-subtle)]">
                      {entry.ip_address ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Journal vide" description="Aucune action enregistrée." />
        )}
      </Panel>

      {(data?.pages ?? 1) > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Précédent
          </Button>
          <span className="text-[var(--color-ink-muted)]">
            Page {data?.page} sur {data?.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= (data?.pages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </>
  );
}
