import { getToken } from "./api";

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export interface PayinPayload {
  wallet: string;
  amount: number;
  currency: string;
  order_id: string;
  description: string;
  payer: string;
  payerEmail: string;
  service: number;
  otp?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SoleasRaw = Record<string, any>;

export const SOLEASPAY_NETWORKS = [
  { id: 2,  name: "Orange Money",  country: "Cameroun 🇨🇲"       },
  { id: 29, name: "Orange Money",  country: "Côte d'Ivoire 🇨🇮"  },
  { id: 30, name: "MTN MoMo",     country: "Côte d'Ivoire 🇨🇮"  },
  { id: 31, name: "Moov Money",   country: "Côte d'Ivoire 🇨🇮"  },
  { id: 32, name: "Wave",         country: "Côte d'Ivoire 🇨🇮"  },
  { id: 35, name: "MTN MoMo",     country: "Bénin 🇧🇯"          },
  { id: 36, name: "Moov Money",   country: "Bénin 🇧🇯"          },
  { id: 37, name: "T-Money",      country: "Togo 🇹🇬"           },
  { id: 38, name: "Moov Money",   country: "Togo 🇹🇬"           },
  { id: 52, name: "Vodacom",      country: "RDC 🇨🇩"            },
  { id: 53, name: "Airtel Money", country: "RDC 🇨🇩"            },
  { id: 54, name: "Orange Money", country: "RDC 🇨🇩"            },
  { id: 55, name: "Airtel Money", country: "Congo 🇨🇬"          },
  { id: 57, name: "Airtel Money", country: "Gabon 🇬🇦"          },
  { id: 58, name: "Airtel Money", country: "Ouganda 🇺🇬"        },
  { id: 59, name: "MTN MoMo",     country: "Ouganda 🇺🇬"        },
];

/** Extrait le statut d'une réponse SoleasPay quelle que soit la structure */
export function extractStatus(raw: SoleasRaw): string {
  const candidates = [
    raw?.data?.status,
    raw?.data?.payment_status,
    raw?.data?.transactionStatus,
    raw?.data?.transaction_status,
    raw?.data?.state,
    raw?.status,
    raw?.payment_status,
    raw?.transactionStatus,
    raw?.state,
    raw?.data?.payment?.status,
    raw?.data?.bill?.status,
    raw?.data?.order?.status,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim().toUpperCase();
  }
  return "";
}

/** Extrait la référence SoleasPay d'une réponse pay-in */
export function extractReference(raw: SoleasRaw): string {
  const candidates = [
    raw?.data?.reference,
    raw?.data?.pay_id,
    raw?.data?.payId,
    raw?.data?.transaction_id,
    raw?.data?.transactionId,
    raw?.data?.id,
    raw?.data?.bill?.reference,
    raw?.data?.payment?.reference,
    raw?.reference,
    raw?.pay_id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

/** Retourne true si le statut correspond à un paiement réussi */
export function isSuccess(status: string): boolean {
  return [
    "SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "APPROVED",
    "CONFIRMED", "DONE", "OK", "200", "ACCEPTED", "VALIDATED",
    "VALID", "EFFECTUE", "EFFECTUÉ", "SUCCES", "SUCCÈS",
  ].includes(status);
}

/** Retourne true si le statut correspond à un paiement échoué */
export function isFailure(status: string): boolean {
  return [
    "FAILED", "FAILURE", "CANCELLED", "CANCELED", "EXPIRED",
    "REJECTED", "REFUSED", "ERROR", "ECHEC", "ÉCHOUÉ", "ÉCHOUE",
    "ANNULE", "ANNULÉ", "EXPIRÉ",
  ].includes(status);
}

// Appels SoleasPay via le backend VPS (évite CORS + clé API côté frontend)
function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function initiatePayin(payload: PayinPayload): Promise<SoleasRaw> {
  const res = await fetch(`${BASE_URL}/api/credits/soleaspay-initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data;
}

export async function verifyPayment(orderId: string, payId: string, serviceId: number): Promise<SoleasRaw> {
  const params = new URLSearchParams({
    orderId,
    payId,
    service: String(serviceId),
  });
  const res = await fetch(`${BASE_URL}/api/credits/soleaspay-verify?${params}`, {
    headers: { ...authHeader() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data;
}
