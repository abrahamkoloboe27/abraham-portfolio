import { Copy, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useDeleteMedia, useMedia, useUploadMedia } from "@/lib/queries";
import type { MediaAsset } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";

const FOLDERS = [
  { value: "general", label: "Général" },
  { value: "avatars", label: "Avatars" },
  { value: "projects", label: "Réalisations" },
  { value: "posts", label: "Articles" },
  { value: "talks", label: "Formations" },
  { value: "logos", label: "Logos" },
  { value: "documents", label: "Documents" },
];

export function Media() {
  const { can } = useAuth();
  const canEdit = can("editor");
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useMedia({
    page,
    folder: folder || undefined,
    search: search || undefined,
  });
  const upload = useUploadMedia();
  const remove = useDeleteMedia();

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      await upload.mutateAsync({ file, folder: folder || "general" });
    }
    event.target.value = "";
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("URL copiée");
  }

  return (
    <>
      <PageHeader
        title="Médias"
        description={`${data?.total ?? 0} fichier(s) dans la bibliothèque`}
        actions={
          canEdit ? (
            <Button loading={upload.isPending} onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" />
              Téléverser
            </Button>
          ) : undefined
        }
      />
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept="image/*,application/pdf"
        onChange={onFiles}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Rechercher…"
          className="max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          className="max-w-48"
          value={folder}
          onChange={(event) => {
            setFolder(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous les dossiers</option>
          {FOLDERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.map((asset) => (
            <li key={asset.id}>
              <Panel className="flex h-full flex-col overflow-hidden">
                {asset.mime_type.startsWith("image/") ? (
                  <img
                    src={asset.url}
                    alt={asset.alt_fr ?? asset.filename}
                    loading="lazy"
                    className="aspect-square w-full bg-[var(--color-panel-alt)] object-cover"
                  />
                ) : (
                  <div className="grid aspect-square place-items-center bg-[var(--color-panel-alt)] text-xs font-medium text-[var(--color-ink-subtle)]">
                    {asset.mime_type.split("/")[1]?.toUpperCase()}
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="truncate text-sm font-medium" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {formatBytes(asset.size_bytes)}
                    {asset.width ? ` · ${asset.width}×${asset.height}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {formatDate(asset.created_at)}
                  </p>

                  <div className="mt-auto flex gap-1 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyUrl(asset.url)}
                    >
                      <Copy className="size-3.5" />
                      URL
                    </Button>
                    {canEdit ? (
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        aria-label="Supprimer"
                        onClick={() => setDeleting(asset)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <EmptyState
            title="Bibliothèque vide"
            description="Téléversez vos images de couverture, logos et documents ici."
          />
        </Panel>
      )}

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

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer ce fichier"
        message={`« ${deleting?.filename} » sera définitivement supprimé du stockage. Les contenus qui l'utilisent afficheront une image manquante.`}
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
