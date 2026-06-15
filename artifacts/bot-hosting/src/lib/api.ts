const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'bothoster_jwt';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DnsRecord {
  id: string;
  domain_id: string;
  user_id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  platform: string;
  language: string;
  status: string;
  source_type: string;
  source_url?: string;
  env_vars: Record<string, string>;
  cpu_usage: number;
  ram_usage: number;
  uptime_seconds: number;
  last_started_at?: string;
  updated_at: string;
  created_at: string;
}

export interface BotFile {
  id: string;
  bot_id: string;
  path: string;
  content: string;
  is_modified: number;
  updated_at: string;
}

export interface BotLog {
  id: string;
  bot_id: string;
  user_id?: string;
  level: string;
  message: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  ram_limit: number;
  expires_at?: string;
  created_at: string;
}

export interface Domain {
  id: string;
  user_id: string;
  name: string;
  tld: string;
  status: string;
  nameserver1: string;
  nameserver2: string;
  expires_at?: string;
  created_at: string;
}

export interface DnsRecord {
  id: string;
  domain_id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<{ token: string; user: AppUser }>('/api/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: AppUser }>('/api/auth/login', { email, password }),
  me: () => api.get<AppUser>('/api/auth/me'),
  updateProfile: (data: { name?: string; email?: string }) =>
    api.put<AppUser>('/api/auth/profile', data),
  changePassword: (current_password: string, new_password: string) =>
    api.put<{ success: boolean }>('/api/auth/password', { current_password, new_password }),
};

// ─── Bots ─────────────────────────────────────────────────────────────────────
export const botsApi = {
  list: () => api.get<Bot[]>('/api/bots'),
  get: (id: string) => api.get<Bot>(`/api/bots/${id}`),
  create: (data: Partial<Bot> & { file_base64?: string }) => api.post<Bot>('/api/bots', data),
  update: (id: string, data: Partial<Bot> & { file_base64?: string }) => api.put<Bot>(`/api/bots/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/bots/${id}`),
  start: (id: string) => api.post<{ success: boolean; message: string }>(`/api/bots/${id}/start`),
  stop: (id: string) => api.post<{ success: boolean; message: string }>(`/api/bots/${id}/stop`),
  restart: (id: string) => api.post<{ success: boolean; message: string }>(`/api/bots/${id}/restart`),
};

// ─── Bot files ────────────────────────────────────────────────────────────────
export const filesApi = {
  list: (botId: string) => api.get<BotFile[]>(`/api/bots/${botId}/files`),
  sync: (botId: string) => api.post<{ synced: number; files: BotFile[] }>(`/api/bots/${botId}/files/sync`, {}),
  create: (botId: string, path: string, content: string) => api.post<BotFile>(`/api/bots/${botId}/files`, { path, content }),
  update: (botId: string, fileId: string, content: string, is_modified = false) =>
    api.put<BotFile>(`/api/bots/${botId}/files/${fileId}`, { content, is_modified }),
  delete: (botId: string, fileId: string) => api.delete<{ success: boolean }>(`/api/bots/${botId}/files/${fileId}`),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logsApi = {
  forBot: (botId: string, limit = 200) => api.get<BotLog[]>(`/api/bots/${botId}/logs?limit=${limit}`),
  all: (limit = 200) => api.get<BotLog[]>(`/api/logs?limit=${limit}`),
};

// ─── Subscription ─────────────────────────────────────────────────────────────
export const subscriptionApi = {
  get: () => api.get<Subscription>('/api/subscription'),
  activate: (plan: string) => api.post<Subscription>('/api/subscription/activate', { plan }),
};

// ─── Domains ──────────────────────────────────────────────────────────────────
export const domainsApi = {
  list: () => api.get<Domain[]>('/api/domains'),
  create: (data: { name: string; tld?: string; expires_at?: string }) => api.post<Domain>('/api/domains', data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/api/domains/${id}`),
};

export const dnsApi = {
  list: (domainId: string) => api.get<DnsRecord[]>(`/api/domains/${domainId}/records`),
  create: (domainId: string, data: Omit<DnsRecord, 'id' | 'domain_id' | 'created_at'>) =>
    api.post<DnsRecord>(`/api/domains/${domainId}/records`, data),
  delete: (domainId: string, recordId: string) =>
    api.delete<{ success: boolean }>(`/api/domains/${domainId}/records/${recordId}`),
};

// ─── Domain orders ────────────────────────────────────────────────────────────
export interface DomainOrder {
  id: string;
  cmd_id: string;
  user_id: string | null;
  domain: string;
  client_name: string;
  client_email: string;
  dns1: string;
  dns2: string;
  status: 'pending' | 'delivered';
  created_at: string;
}

export const domainOrdersApi = {
  check: (domain: string) =>
    api.get<{ domain: string; available: boolean | null; error?: string }>(`/api/domains/check?domain=${encodeURIComponent(domain)}`),
  create: (data: { domain: string; client_name: string; client_email: string }) =>
    api.post<DomainOrder>('/api/domain-orders', data),
  list: () => api.get<DomainOrder[]>('/api/domain-orders'),
  adminList: () => api.get<DomainOrder[]>('/api/admin/domain-orders'),
  deliver: (id: string) => api.patch<DomainOrder>(`/api/admin/domain-orders/${id}/deliver`, {}),
  adminDelete: (id: string) => api.delete<{ success: boolean }>(`/api/admin/domain-orders/${id}`),
  updateDns: (id: string, dns1: string, dns2: string) =>
    api.patch<DomainOrder>(`/api/admin/domain-orders/${id}/dns`, { dns1, dns2 }),
  getRecords: (orderId: string) => api.get<DnsRecord[]>(`/api/domain-orders/${orderId}/records`),
  addRecord: (orderId: string, record: { type: string; name: string; value: string; ttl: number }) =>
    api.post<DnsRecord>(`/api/domain-orders/${orderId}/records`, record),
  deleteRecord: (orderId: string, recordId: string) =>
    api.delete<{ success: boolean }>(`/api/domain-orders/${orderId}/records/${recordId}`),
};

// ─── Hosting web ──────────────────────────────────────────────────────────────
export interface WebSite {
  id: string;
  user_id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  stack: string;
  status: "online" | "deploying" | "error" | "stopped";
  github_url: string | null;
  hostinger_record_id: string | null;
  created_at: string;
  full_domain?: string;
}

export const hostingApi = {
  list: () => api.get<WebSite[]>('/api/hosting/sites'),
  create: (data: {
    name: string;
    subdomain: string;
    custom_domain?: string;
    stack?: string;
    github_url?: string;
  }) => api.post<WebSite & { full_domain: string; hostinger_sync: { success: boolean; message?: string } }>('/api/hosting/sites', data),
  delete: (id: string) => api.delete<{ success: boolean; hostinger_sync: { success: boolean } }>(`/api/hosting/sites/${id}`),
};

// ─── Credits ──────────────────────────────────────────────────────────────────
export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export interface CreditData {
  id: string;
  user_id: string;
  balance: number;
  auto_recharge: number;
  auto_recharge_threshold: number;
  auto_recharge_amount: number;
  transactions: CreditTransaction[];
  updated_at: string;
  created_at: string;
}

export const creditsApi = {
  get: () => api.get<CreditData>('/api/credits'),
  purchase: (pack: string) => api.post<CreditData>('/api/credits/purchase', { pack }),
  soleasPayConfirm: (pack: string, order_id: string, pay_id: string) =>
    api.post<CreditData & { credited: number }>('/api/credits/soleaspay-confirm', { pack, order_id, pay_id }),
  updateAutoRecharge: (auto_recharge: boolean, auto_recharge_threshold: number, auto_recharge_amount: number) =>
    api.put<CreditData>('/api/credits/auto-recharge', { auto_recharge, auto_recharge_threshold, auto_recharge_amount }),
  spend: (amount: number, description: string) =>
    api.post<CreditData>('/api/credits/spend', { amount, description }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  users: () => api.get<(AppUser & { plan: string; ram_limit: number })[]>('/api/admin/users'),
  stats: () => api.get<{ userCount: number; botCount: number; onlineCount: number; activeBots: number }>('/api/admin/stats'),
  updateSubscription: (userId: string, plan: string, ram_limit?: number) =>
    api.patch(`/api/admin/users/${userId}/subscription`, { plan, ram_limit }),
};

// ─── Helper: file to base64 ───────────────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
