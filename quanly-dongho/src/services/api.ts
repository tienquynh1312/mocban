/**
 * src/services/api.ts
 * HTTP client giao tiếp với Backend API
 * Tự động đính kèm JWT token vào mỗi request
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// ─── Token management ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("clan_jwt_token");
}

export function setToken(token: string) {
  localStorage.setItem("clan_jwt_token", token);
}

export function clearToken() {
  localStorage.removeItem("clan_jwt_token");
}

// ─── Base fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: "Phản hồi không hợp lệ từ server." }));

  if (!res.ok) {
    const err: any = new Error(data.error || `HTTP ${res.status}`);
    if (data.detail) err.detail = data.detail;
    throw err;
  }
  return data as T;
}

const get  = <T>(path: string)                => request<T>("GET",    path);
const post = <T>(path: string, body: unknown) => request<T>("POST",   path, body);
const put  = <T>(path: string, body: unknown) => request<T>("PUT",    path, body);
const del  = <T>(path: string)                => request<T>("DELETE", path);

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: (phoneOrEmail: string, password: string) =>
    post<{ token: string; account: any }>("/auth/login", { phoneOrEmail, password }),

  register: (form: {
    fullName: string; phone: string; email: string; password: string;
    birthDate?: string; gender?: string; hometown?: string;
    address?: string; notes?: string; inviteCode: string;
  }) => post<{ message: string }>("/auth/register", form),

  me: () => get<any>("/auth/me"),
};

// ─── Members API ──────────────────────────────────────────────────────────────

export const membersApi = {
  list: (params?: {
    search?: string; gender?: string; livingStatus?: string;
    generation?: number; page?: number; limit?: number;
  }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])
    ) : "";
    return get<{ data: any[]; total: number }>(`/members${qs}`);
  },

  get: (id: string) => get<any>(`/members/${id}`),

  create: (member: any) => post<any>("/members", member),

  update: (id: string, member: Partial<any>) => put<any>(`/members/${id}`, member),

  delete: (id: string) => del<{ message: string }>(`/members/${id}`),
};

// ─── Events API ───────────────────────────────────────────────────────────────

export const eventsApi = {
  list: (params?: { year?: number; month?: number; type?: string; status?: string }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])
    ) : "";
    return get<any[]>(`/events${qs}`);
  },

  create: (event: any) => post<any>("/events", event),

  update: (id: string, event: Partial<any>) => put<any>(`/events/${id}`, event),

  delete: (id: string) => del<{ message: string }>(`/events/${id}`),

  rsvp: (eventId: string, status: string, additionalGuests = 0, reason?: string) =>
    post<{ message: string }>(`/events/${eventId}/rsvp`, { status, additionalGuests, reason }),

  autoGioc: () => post<{ message: string; created: number }>("/events/auto-gioc", {}),
};

// ─── Finance API ──────────────────────────────────────────────────────────────

export const financeApi = {
  transactions: (params?: { type?: string; category?: string; year?: number; page?: number }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])
    ) : "";
    return get<{ data: any[]; total: number }>(`/finance/transactions${qs}`);
  },

  addTransaction: (tx: any) => post<any>("/finance/transactions", tx),

  quota: (year?: number) => get<any>(`/finance/quota${year ? `?year=${year}` : ""}`),

  updateQuota: (year: number, amountPerMember: number, description?: string) =>
    put<any>("/finance/quota", { year, amountPerMember, description }),

  summary: (year?: number) => get<any>(`/finance/summary${year ? `?year=${year}` : ""}`),
};

// ─── Accounts API ─────────────────────────────────────────────────────────────

export const inviteCodesApi = {
  list: () => get<any[]>("/invite-codes"),
  create: (note?: string, expiresAt?: string, usageLimit?: number) =>
    post<{ code: string; message: string }>("/invite-codes", { note, expiresAt, usageLimit }),
  deactivate: (code: string) => del<{ message: string }>(`/invite-codes/${code}/deactivate`),
  reactivate: (code: string) => put<{ message: string }>(`/invite-codes/${code}/reactivate`, {}),
  deleteCode: (code: string) => del<{ message: string }>(`/invite-codes/${code}`),
};

export const accountsApi = {
  list: (params?: { status?: string; role?: string }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])
    ) : "";
    return get<any[]>(`/accounts${qs}`);
  },

  approveAdmin: (id: string) => put<{ message: string }>(`/accounts/${id}/approve-admin`, {}),

  createLeader: (fullName: string, phone: string, email: string, password: string, clanName?: string, clanOrigin?: string) =>
    post<{ message: string; clanId: string }>("/accounts/create-leader", { fullName, phone, email, password, clanName, clanOrigin }),

  approveLeader: (id: string, role: string, memberId?: string) =>
    put<{ message: string }>(`/accounts/${id}/approve-leader`, { role, memberId }),

  reject: (id: string, reason: string) =>
    put<{ message: string }>(`/accounts/${id}/reject`, { reason }),

  block: (id: string, reason: string) =>
    put<{ message: string }>(`/accounts/${id}/block`, { reason }),

  unblock: (id: string) => put<{ message: string }>(`/accounts/${id}/unblock`, {}),

  changeRole: (id: string, role: string) =>
    put<{ message: string }>(`/accounts/${id}/role`, { role }),

  requestDelete: (id: string, reason: string) =>
    put<{ message: string }>(`/accounts/${id}/request-delete`, { reason }),

  approveDelete: (id: string) =>
    del<{ message: string }>(`/accounts/${id}`),

  rejectDelete: (id: string, reason: string) =>
    put<{ message: string }>(`/accounts/${id}/reject-delete`, { reason }),

  editAccount: (id: string, data: Partial<any>) =>
    put<{ message: string }>(`/accounts/${id}/edit`, data),

  auditLogs: (page = 1, limit = 50) =>
    get<{ data: any[]; total: number }>(`/accounts/audit-logs?page=${page}&limit=${limit}`),
};