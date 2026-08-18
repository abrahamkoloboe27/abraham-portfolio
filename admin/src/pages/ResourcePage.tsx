import { ArrowUpDown, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ResourceForm } from "@/components/ResourceForm";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  useCreateResource,
  useDeleteResource,
  useReorderResource,
  useResourceList,
  useUpdateResource,
} from "@/lib/queries";
import { findResource, type ColumnDef, type ResourceDef } from "@/lib/resources";
import type { Entity } from "@/lib/types";
import { cn, formatDate, label as pickLabel } from "@/lib/utils";

export function ResourcePage() {
  const { resourceKey = "" } = useParams();
  const resource = findResource(resourceKey);

  if (!resource) {
    return <ErrorState message={`Ressource inconnue : ${resourceKey}`} />;
  }
  // Remount on navigation so filters and drafts never leak between resources.
  return <ResourceView key={resource.key} resource={resource} />;
}

function ResourceView({ resource }: { resource: ResourceDef }) {
  const { can } = useAuth();
  const canEdit = can("editor");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Entity | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Entity | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<Entity[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const params = useMemo(
    () => ({ page, per_page: reordering ? 100 : 20, search: search || undefined, ...filters }),
    [page, search, filters, reordering],
  );

  const { data, isLoading, isError, refetch } = useResourceList(resource.key, params);
  const create = useCreateResource(resource.key);
  const update = useUpdateResource(resource.key);
  const remove = useDeleteResource(resource.key);
  const reorder = useReorderResource(resource.key);

  const items = reordering ? draft : (data?.items ?? []);

  function startReorder() {
    setDraft([...(data?.items ?? [])]);
    setReordering(true);
  }

  function onDrop(target: number) {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...draft];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setDraft(next);
    setDragIndex(null);
  }

  async function saveOrder() {
    await reorder.mutateAsync(draft.map((item, index) => ({ id: item.id, position: index })));
    setReordering(false);
  }

  async function submit(payload: Record<string, unknown>) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, payload });
    } else {
      await create.mutateAsync(payload);
    }
    setEditing(undefined);
  }

  return (
    <>
      <PageHeader
        title={resource.label}
        description={`${data?.total ?? 0} élément(s)`}
        actions={
          <>
            {resource.reorderable && canEdit && !reordering ? (
              <Button variant="secondary" size="sm" onClick={startReorder}>
                <ArrowUpDown className="size-3.5" />
                Réordonner
              </Button>
            ) : null}
            {reordering ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setReordering(false)}>
                  Annuler
                </Button>
                <Button size="sm" loading={reorder.isPending} onClick={saveOrder}>
                  Enregistrer l&apos;ordre
                </Button>
              </>
            ) : null}
            {canEdit && !reordering ? (
              <Button size="sm" onClick={() => setEditing(null)}>
                <Plus className="size-3.5" />
                Nouveau
              </Button>
            ) : null}
          </>
        }
      />

      {!reordering && (resource.searchable || resource.filters?.length) ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {resource.searchable ? (
            <div className="relative max-w-xs flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-ink-subtle)]"
                aria-hidden
              />
              <Input
                value={search}
                placeholder="Rechercher…"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}

          {resource.filters?.map((filter) => (
            <Select
              key={filter.name}
              value={filters[filter.name] ?? ""}
              className="max-w-48"
              onChange={(event) => {
                setFilters((current) => ({ ...current, [filter.name]: event.target.value }));
                setPage(1);
              }}
            >
              <option value="">{filter.label} : tous</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState message="Impossible de charger les données." onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucun élément"
            description={`Créez votre premier·ère ${resource.singular}.`}
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setEditing(null)}>
                  <Plus className="size-3.5" />
                  Nouveau
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-panel-alt)] text-left">
                <tr>
                  {reordering ? <th className="w-10" /> : null}
                  {resource.columns.map((column) => (
                    <th
                      key={column.name}
                      className="px-4 py-2.5 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                  {canEdit && !reordering ? <th className="w-24 px-4 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    draggable={reordering}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => onDrop(index)}
                    className={cn(
                      "border-b border-[var(--color-line)] last:border-0",
                      reordering ? "cursor-grab active:cursor-grabbing" : "hover:bg-[var(--color-panel-alt)]",
                      dragIndex === index && "opacity-50",
                    )}
                  >
                    {reordering ? (
                      <td className="px-3 text-[var(--color-ink-subtle)]">
                        <GripVertical className="size-4" aria-hidden />
                      </td>
                    ) : null}

                    {resource.columns.map((column) => (
                      <td key={column.name} className="px-4 py-3 align-middle">
                        <Cell item={item} column={column} />
                      </td>
                    ))}

                    {canEdit && !reordering ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label="Modifier"
                            onClick={() => setEditing(item)}
                            className="rounded-md p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Supprimer"
                            onClick={() => setDeleting(item)}
                            className="rounded-md p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!reordering && (data?.pages ?? 1) > 1 ? (
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

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        size="lg"
        title={editing ? `Modifier — ${pickLabel(editing, "title")}` : `Nouveau · ${resource.singular}`}
        description={editing ? undefined : `Créer un·e ${resource.singular}`}
      >
        {editing !== undefined ? (
          <ResourceForm
            resource={resource}
            item={editing}
            submitting={create.isPending || update.isPending}
            onCancel={() => setEditing(undefined)}
            onSubmit={submit}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Confirmer la suppression"
        message={`Supprimer « ${deleting ? pickLabel(deleting, "title") : ""} » ? Cette action est définitive.`}
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

function Cell({ item, column }: { item: Entity; column: ColumnDef }) {
  const raw = column.bilingual ? pickLabel(item, column.name) : item[column.name];

  switch (column.type) {
    case "boolean":
      return raw ? (
        <Badge tone="success">Oui</Badge>
      ) : (
        <span className="text-[var(--color-ink-subtle)]">—</span>
      );

    case "badge": {
      if (!raw) return <span className="text-[var(--color-ink-subtle)]">—</span>;
      const value = String(raw);
      const tone =
        value === "published" ? "success" : value === "draft" ? "warning" : "neutral";
      return <Badge tone={tone}>{value.replace(/-/g, " ")}</Badge>;
    }

    case "date":
      return (
        <span className="text-[var(--color-ink-muted)]">{formatDate(raw as string | null)}</span>
      );

    case "number":
      return <span className="tabular-nums">{raw === null || raw === undefined ? "—" : String(raw)}</span>;

    case "image":
      return raw ? (
        <img src={String(raw)} alt="" className="size-9 rounded object-cover" />
      ) : (
        <span className="text-[var(--color-ink-subtle)]">—</span>
      );

    default:
      return (
        <span className="line-clamp-1 font-medium">
          {raw ? String(raw) : <span className="font-normal text-[var(--color-ink-subtle)]">—</span>}
        </span>
      );
  }
}
