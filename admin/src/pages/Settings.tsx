import { useState } from "react";

import { BilingualInput, FieldShell, ImageField, JsonField, StringListEditor } from "@/components/fields";
import { Button, ErrorState, Input, LoadingBlock, PageHeader, Panel, Switch } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useSettings, useUpdateSettings } from "@/lib/queries";
import type { FieldDef } from "@/lib/resources";
import { cn, diffPayload } from "@/lib/utils";

const TABS = [
  { key: "identity", label: "Identité" },
  { key: "contact", label: "Contact" },
  { key: "assets", label: "Visuels & CV" },
  { key: "seo", label: "SEO" },
  { key: "advanced", label: "Avancé" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const FIELDS: Record<TabKey, FieldDef[]> = {
  identity: [
    { name: "site_name", label: "Nom du site", type: "text", half: true },
    { name: "full_name", label: "Nom complet", type: "text", half: true },
    { name: "job_title", label: "Intitulé de poste", type: "text", bilingual: true },
    { name: "tagline", label: "Accroche", type: "text", bilingual: true },
    { name: "bio", label: "Biographie", type: "textarea", bilingual: true },
    { name: "quote", label: "Citation", type: "text", bilingual: true },
    { name: "footer_note", label: "Note de pied de page", type: "text", bilingual: true },
  ],
  contact: [
    { name: "email", label: "Email public", type: "text", half: true },
    { name: "phone", label: "Téléphone", type: "text", half: true },
    { name: "location", label: "Localisation", type: "text", half: true },
    { name: "timezone", label: "Fuseau horaire", type: "text", half: true },
    { name: "calendar_url", label: "Lien de prise de rendez-vous", type: "text" },
    { name: "availability", label: "Disponibilité affichée", type: "text", bilingual: true },
  ],
  assets: [
    { name: "avatar_url", label: "Photo de profil", type: "image" },
    { name: "logo_url", label: "Logo", type: "image" },
    { name: "og_image_url", label: "Image de partage (OpenGraph)", type: "image" },
    { name: "favicon_url", label: "Favicon", type: "image" },
    { name: "resume_url_fr", label: "CV — version française (URL)", type: "text" },
    { name: "resume_url_en", label: "CV — version anglaise (URL)", type: "text" },
  ],
  seo: [
    { name: "seo_title", label: "Titre SEO", type: "text", bilingual: true },
    { name: "seo_description", label: "Description SEO", type: "textarea", bilingual: true },
  ],
  advanced: [
    { name: "default_locale", label: "Langue par défaut", type: "text", half: true },
    { name: "theme", label: "Thème (JSON)", type: "json" },
    { name: "features", label: "Fonctionnalités activées (JSON)", type: "json" },
    { name: "analytics", label: "Analytics (JSON)", type: "json" },
  ],
};

export function Settings() {
  const { can } = useAuth();
  const canEdit = can("editor");
  const { data, isLoading, isError, refetch } = useSettings();
  const update = useUpdateSettings();

  const [tab, setTab] = useState<TabKey>("identity");
  // `null` means "untouched": the form then mirrors the server state directly,
  // so no effect is needed to sync the two.
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  const values = draft ?? data ?? {};

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) {
    return <ErrorState message="Paramètres indisponibles." onRetry={() => void refetch()} />;
  }

  function set(name: string, value: unknown) {
    setDraft((current) => ({ ...(current ?? data ?? {}), [name]: value }));
  }

  async function save() {
    const payload = diffPayload(values, data ?? {});
    if (!Object.keys(payload).length) return;
    await update.mutateAsync(payload);
    // Drop the draft so the form re-syncs with what the server actually stored.
    setDraft(null);
  }

  const dirty = Object.keys(diffPayload(values, data)).length > 0;

  return (
    <>
      <PageHeader
        title="Paramètres du site"
        description="Identité, contact, SEO et options globales — appliqués immédiatement au site public."
        actions={
          canEdit ? (
            <Button onClick={save} loading={update.isPending} disabled={!dirty}>
              Enregistrer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--color-line)]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === item.key
                ? "border-[var(--color-brand)] font-medium text-[var(--color-brand)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel className="p-5 sm:p-6">
        <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
          {FIELDS[tab].map((field) => (
            <div key={field.name} className={cn(field.half ? "sm:col-span-1" : "sm:col-span-2")}>
              {field.bilingual ? (
                <BilingualInput field={field} values={values} onChange={set} />
              ) : field.type === "image" ? (
                <FieldShell label={field.label}>
                  <ImageField
                    value={values[field.name] as string | null}
                    onChange={(next) => set(field.name, next ?? "")}
                  />
                </FieldShell>
              ) : field.type === "json" ? (
                <FieldShell label={field.label}>
                  <JsonField
                    value={values[field.name]}
                    onChange={(next) => set(field.name, next)}
                  />
                </FieldShell>
              ) : field.type === "textarea" ? (
                <FieldShell label={field.label} htmlFor={field.name}>
                  <textarea
                    id={field.name}
                    rows={3}
                    className="field-input resize-y"
                    value={(values[field.name] as string) ?? ""}
                    onChange={(event) => set(field.name, event.target.value)}
                  />
                </FieldShell>
              ) : (
                <FieldShell label={field.label} htmlFor={field.name}>
                  <Input
                    id={field.name}
                    value={(values[field.name] as string) ?? ""}
                    onChange={(event) => set(field.name, event.target.value)}
                  />
                </FieldShell>
              )}
            </div>
          ))}

          {tab === "identity" ? (
            <div className="sm:col-span-2">
              <Switch
                checked={Boolean(values.is_open_to_work)}
                onChange={(next) => set("is_open_to_work", next)}
                label="Afficher le badge « ouvert aux opportunités »"
              />
            </div>
          ) : null}

          {tab === "seo" ? (
            <div className="sm:col-span-2">
              <FieldShell label="Mots-clés SEO">
                <StringListEditor
                  values={(values.seo_keywords as string[]) ?? []}
                  onChange={(next) => set("seo_keywords", next)}
                />
              </FieldShell>
            </div>
          ) : null}

          {tab === "advanced" ? (
            <div className="sm:col-span-2">
              <Switch
                checked={Boolean(values.maintenance_mode)}
                onChange={(next) => set("maintenance_mode", next)}
                label="Mode maintenance"
              />
            </div>
          ) : null}
        </fieldset>
      </Panel>

      {dirty && canEdit ? (
        <div className="sticky bottom-4 mt-4 flex justify-end">
          <Button onClick={save} loading={update.isPending}>
            Enregistrer les modifications
          </Button>
        </div>
      ) : null}
    </>
  );
}
