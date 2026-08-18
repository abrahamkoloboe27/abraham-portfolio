import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, buildQuery, http } from "@/lib/api";
import { findResource } from "@/lib/resources";
import type {
  AuditEntry,
  ContactMessage,
  DashboardStats,
  Entity,
  Invitation,
  MediaAsset,
  Paginated,
  User,
} from "@/lib/types";

function notifyError(error: unknown, fallback: string) {
  const message = error instanceof ApiError ? error.message : fallback;
  toast.error(message);
}

/* ------------------------------------------------------------- resources */
export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  order_by?: string;
  [key: string]: unknown;
}

export function useResourceList(resourceKey: string, params: ListParams = {}) {
  const resource = findResource(resourceKey);
  return useQuery({
    queryKey: ["resource", resourceKey, params],
    queryFn: () => http.get<Paginated<Entity>>(`${resource!.path}${buildQuery(params)}`),
    enabled: Boolean(resource),
    placeholderData: (previous) => previous,
  });
}

export function useResourceItem(resourceKey: string, id?: string) {
  const resource = findResource(resourceKey);
  return useQuery({
    queryKey: ["resource", resourceKey, "item", id],
    queryFn: () => http.get<Entity>(`${resource!.path}/${id}`),
    enabled: Boolean(resource && id),
  });
}

/** Loads every row of a resource — used to populate relation pickers. */
export function useResourceOptions(resourceKey?: string) {
  const resource = resourceKey ? findResource(resourceKey) : undefined;
  return useQuery({
    queryKey: ["resource", resourceKey, "options"],
    queryFn: () => http.get<Paginated<Entity>>(`${resource!.path}?per_page=100`),
    enabled: Boolean(resource),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateResource(resourceKey: string) {
  const resource = findResource(resourceKey)!;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => http.post<Entity>(resource.path, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["resource", resourceKey] });
      toast.success(`${resource.singular} créé·e`);
    },
    onError: (error) => notifyError(error, "La création a échoué"),
  });
}

export function useUpdateResource(resourceKey: string) {
  const resource = findResource(resourceKey)!;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      http.patch<Entity>(`${resource.path}/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["resource", resourceKey] });
      toast.success("Modifications enregistrées");
    },
    onError: (error) => notifyError(error, "L'enregistrement a échoué"),
  });
}

export function useDeleteResource(resourceKey: string) {
  const resource = findResource(resourceKey)!;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ detail: string }>(`${resource.path}/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["resource", resourceKey] });
      toast.success("Élément supprimé");
    },
    onError: (error) => notifyError(error, "La suppression a échoué"),
  });
}

export function useReorderResource(resourceKey: string) {
  const resource = findResource(resourceKey)!;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      http.post<{ updated: number }>(`${resource.path}/reorder`, { items }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["resource", resourceKey] });
      toast.success("Ordre mis à jour");
    },
    onError: (error) => notifyError(error, "Le réordonnancement a échoué"),
  });
}

/* ------------------------------------------------------------- dashboard */
export function useDashboard(options?: Partial<UseQueryOptions<DashboardStats>>) {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => http.get<DashboardStats>("/admin/dashboard/stats"),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useAuditLog(params: { page?: number; entity_type?: string; action?: string } = {}) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () => http.get<Paginated<AuditEntry>>(`/admin/dashboard/audit${buildQuery(params)}`),
    placeholderData: (previous) => previous,
  });
}

/* -------------------------------------------------------------- settings */
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => http.get<Record<string, unknown>>("/admin/dashboard/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      http.patch<Record<string, unknown>>("/admin/dashboard/settings", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Paramètres enregistrés");
    },
    onError: (error) => notifyError(error, "L'enregistrement a échoué"),
  });
}

/* ----------------------------------------------------------------- media */
export function useMedia(params: { page?: number; folder?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["media", params],
    queryFn: () => http.get<Paginated<MediaAsset>>(`/admin/media${buildQuery(params)}`),
    placeholderData: (previous) => previous,
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      return http.upload<MediaAsset>("/admin/media/upload", formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Fichier téléversé");
    },
    onError: (error) => notifyError(error, "Le téléversement a échoué"),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ detail: string }>(`/admin/media/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Fichier supprimé");
    },
    onError: (error) => notifyError(error, "La suppression a échoué"),
  });
}

/* -------------------------------------------------------------- messages */
export function useMessages(
  params: { page?: number; unread?: boolean; archived?: boolean; spam?: boolean } = {},
) {
  return useQuery({
    queryKey: ["messages", params],
    queryFn: () => http.get<Paginated<ContactMessage>>(`/admin/messages${buildQuery(params)}`),
    placeholderData: (previous) => previous,
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      http.patch<ContactMessage>(`/admin/messages/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => notifyError(error, "La mise à jour a échoué"),
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ detail: string }>(`/admin/messages/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message supprimé");
    },
    onError: (error) => notifyError(error, "La suppression a échoué"),
  });
}

/* ------------------------------------------------------------------ team */
export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => http.get<Paginated<User>>("/admin/team/users?per_page=100"),
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: () => http.get<Invitation[]>("/admin/team/invitations"),
  });
}

export function useInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role: string; message?: string }) =>
      http.post<Invitation>("/admin/team/invitations", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation envoyée");
    },
    onError: (error) => notifyError(error, "L'invitation a échoué"),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ detail: string }>(`/admin/team/invitations/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation révoquée");
    },
    onError: (error) => notifyError(error, "La révocation a échoué"),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      http.patch<User>(`/admin/team/users/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Accès mis à jour");
    },
    onError: (error) => notifyError(error, "La mise à jour a échoué"),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ detail: string }>(`/admin/team/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Accès révoqué");
    },
    onError: (error) => notifyError(error, "La révocation a échoué"),
  });
}
