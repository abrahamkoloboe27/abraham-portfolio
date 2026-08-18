import { useMemo, useState } from "react";

import {
  BilingualInput,
  BooleanField,
  FieldShell,
  HighlightsEditor,
  ImageField,
  JsonField,
  LinksEditor,
  MarkdownEditor,
  MetricsEditor,
  RelationMultiSelect,
  RelationSelect,
  StringListEditor,
} from "@/components/fields";
import { Button, Input, Select, Textarea } from "@/components/ui";
import type { FieldDef, ResourceDef } from "@/lib/resources";
import type { Entity } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

type Values = Record<string, unknown>;

/** Expands bilingual definitions into the concrete `_fr` / `_en` field names. */
function concreteNames(field: FieldDef): string[] {
  if (field.name === "tags") return ["tag_ids"];
  return field.bilingual ? [`${field.name}_fr`, `${field.name}_en`] : [field.name];
}

function initialValues(resource: ResourceDef, item?: Entity | null): Values {
  const values: Values = { ...(resource.defaults ?? {}) };

  for (const field of resource.fields) {
    for (const name of concreteNames(field)) {
      if (values[name] === undefined) {
        values[name] = defaultForType(field.type, name);
      }
    }
  }

  if (item) {
    for (const field of resource.fields) {
      for (const name of concreteNames(field)) {
        if (name === "tag_ids") {
          values.tag_ids = ((item.tags as Entity[] | undefined) ?? []).map((tag) => tag.id);
        } else if (item[name] !== undefined && item[name] !== null) {
          values[name] = item[name];
        }
      }
    }
  }
  return values;
}

function defaultForType(type: FieldDef["type"], name: string): unknown {
  switch (type) {
    case "boolean":
      return name === "is_visible";
    case "stringList":
    case "highlights":
    case "links":
    case "metrics":
    case "relationMulti":
      return [];
    case "json":
      return {};
    case "number":
      return "";
    default:
      return "";
  }
}

/** Strips empty strings so the API receives `null` rather than `""`. */
function serialize(values: Values, resource: ResourceDef): Values {
  const payload: Values = {};
  const numericFields = new Set(
    resource.fields.filter((field) => field.type === "number").flatMap(concreteNames),
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === "") {
      payload[key] = null;
    } else if (numericFields.has(key)) {
      payload[key] = value === null ? null : Number(value);
    } else {
      payload[key] = value;
    }
  }

  // Required text fields must never be sent as null.
  for (const field of resource.fields) {
    if (!field.required) continue;
    for (const name of concreteNames(field)) {
      if (payload[name] === null) payload[name] = "";
    }
  }
  return payload;
}

export function ResourceForm({
  resource,
  item,
  onSubmit,
  onCancel,
  submitting,
}: {
  resource: ResourceDef;
  item?: Entity | null;
  onSubmit: (payload: Values) => void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<Values>(() => initialValues(resource, item));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const field of resource.fields) {
      const group = field.group ?? "Général";
      map.set(group, [...(map.get(group) ?? []), field]);
    }
    return [...map.entries()];
  }, [resource]);

  function set(name: string, value: unknown) {
    setValues((current) => {
      const next = { ...current, [name]: value };

      // Auto-fill the slug from its source field, but only while creating.
      if (!item) {
        const slugField = resource.fields.find((field) => field.slugFrom === name);
        if (slugField && typeof value === "string" && !current[slugField.name]) {
          next[slugField.name] = slugify(value);
        }
      }
      return next;
    });
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    for (const field of resource.fields) {
      if (!field.required) continue;
      const names = concreteNames(field);
      // A bilingual field is satisfied as soon as one language is filled in.
      const filled = names.some((name) => {
        const value = values[name];
        return typeof value === "string" ? value.trim() !== "" : Boolean(value);
      });
      if (!filled) nextErrors[names[0]] = "Ce champ est obligatoire";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(serialize(values, resource));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      {groups.map(([group, fields]) => (
        <fieldset key={group} className="flex flex-col gap-4">
          {groups.length > 1 ? (
            <legend className="mb-1 text-xs font-semibold tracking-[0.12em] text-[var(--color-ink-subtle)] uppercase">
              {group}
            </legend>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn(field.half ? "sm:col-span-1" : "sm:col-span-2")}
              >
                <FieldRenderer
                  field={field}
                  values={values}
                  error={errors[concreteNames(field)[0]]}
                  onChange={set}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-panel)] px-5 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={submitting}>
          {item ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

function FieldRenderer({
  field,
  values,
  error,
  onChange,
}: {
  field: FieldDef;
  values: Values;
  error?: string;
  onChange: (name: string, value: unknown) => void;
}) {
  const name = field.name;
  const value = values[name];

  const wrapped = (children: React.ReactNode) => (
    <FieldShell label={field.label} help={field.help} required={field.required} htmlFor={name}>
      {children}
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </FieldShell>
  );

  if (field.bilingual) {
    return (
      <>
        <BilingualInput field={field} values={values} onChange={onChange} />
        {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}
      </>
    );
  }

  switch (field.type) {
    case "boolean":
      return (
        <BooleanField
          label={field.label}
          value={Boolean(value)}
          onChange={(next) => onChange(name, next)}
        />
      );

    case "select":
      return wrapped(
        <Select
          id={name}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
        >
          <option value="">— Choisir —</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>,
      );

    case "textarea":
      return wrapped(
        <Textarea
          id={name}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
        />,
      );

    case "markdown":
      return wrapped(
        <MarkdownEditor
          id={name}
          value={(value as string) ?? ""}
          onChange={(next) => onChange(name, next)}
        />,
      );

    case "number":
      return wrapped(
        <Input
          id={name}
          type="number"
          min={field.min}
          max={field.max}
          value={(value as string | number) ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
        />,
      );

    case "date":
      return wrapped(
        <Input
          id={name}
          type="date"
          value={((value as string) ?? "").slice(0, 10)}
          onChange={(event) => onChange(name, event.target.value)}
        />,
      );

    case "datetime":
      return wrapped(
        <Input
          id={name}
          type="datetime-local"
          value={((value as string) ?? "").slice(0, 16)}
          onChange={(event) =>
            onChange(name, event.target.value ? new Date(event.target.value).toISOString() : "")
          }
        />,
      );

    case "color":
      return wrapped(
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={field.label}
            value={(value as string) || "#2563eb"}
            onChange={(event) => onChange(name, event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--color-line)] bg-transparent"
          />
          <Input
            value={(value as string) ?? ""}
            placeholder="#2563eb"
            onChange={(event) => onChange(name, event.target.value)}
          />
        </div>,
      );

    case "image":
      return wrapped(
        <ImageField
          value={value as string | null}
          onChange={(next) => onChange(name, next ?? "")}
        />,
      );

    case "stringList":
      return wrapped(
        <StringListEditor
          values={(value as string[]) ?? []}
          onChange={(next) => onChange(name, next)}
        />,
      );

    case "highlights":
      return wrapped(
        <HighlightsEditor
          rows={(value as Record<string, string>[]) ?? []}
          onChange={(next) => onChange(name, next)}
        />,
      );

    case "links":
      return wrapped(
        <LinksEditor
          rows={(value as Record<string, string>[]) ?? []}
          onChange={(next) => onChange(name, next)}
        />,
      );

    case "metrics":
      return wrapped(
        <MetricsEditor
          rows={(value as Record<string, string>[]) ?? []}
          onChange={(next) => onChange(name, next)}
        />,
      );

    case "json":
      return wrapped(<JsonField value={value} onChange={(next) => onChange(name, next)} />);

    case "relation":
      return wrapped(
        <RelationSelect
          resourceKey={field.relation!}
          value={value as string | null}
          onChange={(next) => onChange(name, next ?? "")}
        />,
      );

    case "relationMulti":
      return wrapped(
        <RelationMultiSelect
          resourceKey={field.relation!}
          values={(values.tag_ids as string[]) ?? []}
          onChange={(next) => onChange("tag_ids", next)}
        />,
      );

    default:
      return wrapped(
        <Input
          id={name}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />,
      );
  }
}
