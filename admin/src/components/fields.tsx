import { Eye, GripVertical, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MediaPicker } from "@/components/MediaPicker";
import { Button, Input, Select, Switch, Textarea } from "@/components/ui";
import { useResourceOptions } from "@/lib/queries";
import type { FieldDef } from "@/lib/resources";
import type { Entity } from "@/lib/types";
import { cn, label as pickLabel } from "@/lib/utils";

export function FieldShell({
  label,
  help,
  required,
  htmlFor,
  children,
  action,
}: {
  label: string;
  help?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? <span className="ml-0.5 text-[var(--color-brand)]">*</span> : null}
        </label>
        {action}
      </div>
      {children}
      {help ? <p className="text-xs text-[var(--color-ink-subtle)]">{help}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------- bilingual tabs */
export function BilingualInput({
  field,
  values,
  onChange,
}: {
  field: FieldDef;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}) {
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const name = `${field.name}_${locale}`;
  const value = (values[name] as string) ?? "";
  const otherFilled = Boolean(values[`${field.name}_${locale === "fr" ? "en" : "fr"}`]);

  return (
    <FieldShell
      label={field.label}
      help={field.help}
      required={field.required}
      htmlFor={name}
      action={
        <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-line)] text-xs">
          {(["fr", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={cn(
                "px-2 py-1 font-semibold uppercase transition-colors",
                locale === code
                  ? "bg-[var(--color-brand)] text-white"
                  : "text-[var(--color-ink-subtle)] hover:bg-[var(--color-panel-alt)]",
              )}
            >
              {code}
              {values[`${field.name}_${code}`] ? "" : " ·"}
            </button>
          ))}
        </div>
      }
    >
      {field.type === "markdown" ? (
        <MarkdownEditor
          id={name}
          value={value}
          onChange={(next) => onChange(name, next)}
          placeholder={field.placeholder}
        />
      ) : field.type === "textarea" ? (
        <Textarea
          id={name}
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />
      ) : (
        <Input
          id={name}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />
      )}
      {!value && otherFilled ? (
        <p className="text-xs text-[var(--color-warning)]">
          Version {locale.toUpperCase()} vide — le site affichera l&apos;autre langue.
        </p>
      ) : null}
    </FieldShell>
  );
}

/* ------------------------------------------------------ markdown editor */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-panel-alt)] px-2 py-1.5">
        <span className="text-xs text-[var(--color-ink-subtle)]">Markdown</span>
        <button
          type="button"
          onClick={() => setPreview((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-panel)]"
        >
          {preview ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
          {preview ? "Éditer" : "Aperçu"}
        </button>
      </div>

      {preview ? (
        <div className="markdown-preview min-h-40 px-3.5 py-3">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-[var(--color-ink-subtle)]">Rien à prévisualiser.</p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          value={value}
          placeholder={placeholder ?? "## Titre\n\nVotre contenu en Markdown…"}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          spellCheck
          className="w-full resize-y bg-[var(--color-panel)] px-3.5 py-3 font-[var(--font-mono)] text-sm outline-none"
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------- string lists */
export function StringListEditor({
  values,
  onChange,
  placeholder = "Ajouter puis Entrée",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const entry = draft.trim();
    if (!entry || values.includes(entry)) return;
    onChange([...values, entry]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((entry) => (
            <li key={entry}>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-panel-alt)] py-1 pr-1 pl-2.5 text-xs">
                {entry}
                <button
                  type="button"
                  aria-label={`Retirer ${entry}`}
                  onClick={() => onChange(values.filter((item) => item !== entry))}
                  className="rounded-full p-0.5 hover:bg-[var(--color-line)]"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------- repeatable objects */
type Row = Record<string, string>;

function RepeatableEditor({
  rows,
  onChange,
  columns,
  addLabel,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  columns: { key: string; label: string; textarea?: boolean }[];
  addLabel: string;
}) {
  function update(index: number, key: string, value: string) {
    const next = rows.map((row, position) =>
      position === index ? { ...row, [key]: value } : row,
    );
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-alt)] p-2.5"
        >
          <div className="flex flex-col gap-0.5 pt-1.5">
            <button
              type="button"
              aria-label="Monter"
              onClick={() => move(index, -1)}
              className="text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
            >
              <GripVertical className="size-3.5 rotate-180" />
            </button>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col gap-1">
                <span className="text-xs text-[var(--color-ink-subtle)]">{column.label}</span>
                {column.textarea ? (
                  <Textarea
                    rows={2}
                    value={row[column.key] ?? ""}
                    onChange={(event) => update(index, column.key, event.target.value)}
                  />
                ) : (
                  <Input
                    value={row[column.key] ?? ""}
                    onChange={(event) => update(index, column.key, event.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-label="Supprimer la ligne"
            onClick={() => onChange(rows.filter((_, position) => position !== index))}
            className="mt-1 rounded-md p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...rows, {}])}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

export function HighlightsEditor({
  rows,
  onChange,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  return (
    <RepeatableEditor
      rows={rows}
      onChange={onChange}
      addLabel="Ajouter une réalisation"
      columns={[
        { key: "fr", label: "Français", textarea: true },
        { key: "en", label: "Anglais", textarea: true },
      ]}
    />
  );
}

export function LinksEditor({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  return (
    <RepeatableEditor
      rows={rows}
      onChange={onChange}
      addLabel="Ajouter un lien"
      columns={[
        { key: "label", label: "Libellé" },
        { key: "url", label: "URL" },
      ]}
    />
  );
}

export function MetricsEditor({
  rows,
  onChange,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  return (
    <RepeatableEditor
      rows={rows}
      onChange={onChange}
      addLabel="Ajouter un résultat"
      columns={[
        { key: "value", label: "Valeur (ex. −40 %)" },
        { key: "label_fr", label: "Libellé FR" },
        { key: "label_en", label: "Libellé EN" },
      ]}
    />
  );
}

/* ------------------------------------------------------------ relations */
export function RelationSelect({
  resourceKey,
  value,
  onChange,
  allowEmpty = true,
}: {
  resourceKey: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  allowEmpty?: boolean;
}) {
  const { data, isLoading } = useResourceOptions(resourceKey);

  return (
    <Select
      value={value ?? ""}
      disabled={isLoading}
      onChange={(event) => onChange(event.target.value || null)}
    >
      {allowEmpty ? <option value="">— Aucun —</option> : null}
      {(data?.items ?? []).map((item) => (
        <option key={item.id} value={item.id}>
          {pickLabel(item, "name") !== "—" ? pickLabel(item, "name") : pickLabel(item, "title")}
        </option>
      ))}
    </Select>
  );
}

export function RelationMultiSelect({
  resourceKey,
  values,
  onChange,
}: {
  resourceKey: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { data, isLoading } = useResourceOptions(resourceKey);
  const items = (data?.items ?? []) as Entity[];

  if (isLoading) {
    return <p className="text-sm text-[var(--color-ink-subtle)]">Chargement…</p>;
  }
  if (!items.length) {
    return <p className="text-sm text-[var(--color-ink-subtle)]">Aucune option disponible.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const selected = values.includes(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected ? values.filter((id) => id !== item.id) : [...values, item.id],
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                selected
                  ? "border-transparent bg-[var(--color-brand)] text-white"
                  : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-[var(--color-line-strong)]",
              )}
            >
              {pickLabel(item, "name")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- image */
export function ImageField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt=""
            className="size-16 shrink-0 rounded-lg border border-[var(--color-line)] object-cover"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-[var(--color-line-strong)]">
            <ImageIcon className="size-5 text-[var(--color-ink-subtle)]" aria-hidden />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            value={value ?? ""}
            placeholder="https://… ou choisir dans la bibliothèque"
            onChange={(event) => onChange(event.target.value || null)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPicking(true)}>
              Bibliothèque
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(null)}
              >
                Retirer
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={(asset) => {
          onChange(asset.url);
          setPicking(false);
        }}
      />
    </>
  );
}

/* ----------------------------------------------------------------- json */
export function JsonField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        rows={6}
        value={text}
        spellCheck={false}
        className="font-[var(--font-mono)] text-xs"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            onChange(next.trim() ? JSON.parse(next) : {});
            setError(null);
          } catch {
            setError("JSON invalide — les modifications ne seront pas enregistrées.");
          }
        }}
      />
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- switch */
export function BooleanField({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex h-full items-end pb-1">
      <Switch checked={value} onChange={onChange} label={label} />
    </div>
  );
}
