import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button, EmptyState, Input, LoadingBlock, Modal, Select } from "@/components/ui";
import { useMedia, useUploadMedia } from "@/lib/queries";
import type { MediaAsset } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

const FOLDERS = [
  { value: "general", label: "Général" },
  { value: "avatars", label: "Avatars" },
  { value: "projects", label: "Réalisations" },
  { value: "posts", label: "Articles" },
  { value: "talks", label: "Formations" },
  { value: "logos", label: "Logos" },
  { value: "documents", label: "Documents" },
];

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();

  const { data, isLoading } = useMedia({
    folder: folder || undefined,
    search: search || undefined,
    page: 1,
  });

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset = await upload.mutateAsync({ file, folder: folder || "general" });
    event.target.value = "";
    onSelect(asset);
  }

  return (
    <Modal open={open} onClose={onClose} title="Bibliothèque de médias" size="lg">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher un fichier…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Select
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          className="max-w-44"
        >
          <option value="">Tous les dossiers</option>
          {FOLDERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-3.5" />
          Téléverser
        </Button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/*,application/pdf"
          onChange={onFile}
        />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => onSelect(asset)}
                className="w-full overflow-hidden rounded-lg border border-[var(--color-line)] text-left transition-colors hover:border-[var(--color-brand)]"
              >
                {asset.mime_type.startsWith("image/") ? (
                  <img
                    src={asset.url}
                    alt={asset.alt_fr ?? asset.filename}
                    loading="lazy"
                    className="aspect-square w-full bg-[var(--color-panel-alt)] object-cover"
                  />
                ) : (
                  <div className="grid aspect-square place-items-center bg-[var(--color-panel-alt)] text-xs text-[var(--color-ink-subtle)]">
                    {asset.mime_type.split("/")[1]?.toUpperCase()}
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium">{asset.filename}</p>
                  <p className="text-[10px] text-[var(--color-ink-subtle)]">
                    {formatBytes(asset.size_bytes)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Bibliothèque vide"
          description="Téléversez une première image pour la réutiliser partout."
        />
      )}
    </Modal>
  );
}
