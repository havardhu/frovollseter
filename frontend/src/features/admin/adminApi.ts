import { api } from "@/api/client";
import type { AdminUser, AdminAssociation, MassInvite, MassInviteCreated } from "@/api/types";

export const adminApi = {
  listUsers: () => api.get<AdminUser[]>("/admin/users"),
  updateRole: (id: string, role: string) =>
    api.patch<AdminUser>(`/admin/users/${id}/role`, { role }),
  updateStatus: (id: string, status: string) =>
    api.patch<AdminUser>(`/admin/users/${id}/status`, { status }),
  updateUser: (
    id: string,
    data: { displayName?: string; phone?: string; email?: string; associationId?: string }
  ) => api.patch<AdminUser>(`/admin/users/${id}`, data),
  listAssociations: () => api.get<AdminAssociation[]>("/admin/associations"),
  createAssociation: (name: string, type: string) =>
    api.post<AdminAssociation>("/admin/associations", { name, type }),
  updateAssociation: (id: string, data: { name?: string; type?: string }) =>
    api.patch<AdminAssociation>(`/admin/associations/${id}`, data),
  inviteUser: (email: string, displayName: string, associationId?: string, role?: string) =>
    api.post<AdminUser>("/auth/invite", { email, displayName, associationId, role }),
  listMassInvites: () => api.get<MassInvite[]>("/auth/mass-invite"),
  createMassInvite: (data: { associationId?: string; expiresAt: string; note?: string }) =>
    api.post<MassInviteCreated>("/auth/mass-invite", data),
  deleteMassInvite: (id: string) => api.delete<void>(`/auth/mass-invite/${id}`),
};
