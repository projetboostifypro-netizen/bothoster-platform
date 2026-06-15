import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { creditsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  initiatePayin, verifyPayment,
  extractReference, extractStatus,
  isSuccess, isFailure,
  SOLEASPAY_NETWORKS,
} from "@/lib/soleaspay";
import { CheckCircle, Loader2, AlertCircle, Phone, RefreshCw, Coins, X } from "lucide-react";

interface Pack {
  id: string;
  name: string;
  credits: number;
  total?: number;
  price: number;
  amountXAF: number;
}

interface CreditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  pack: Pack;
  onSuccess: (newBalance: number) => void;
}

type Step = "form" | "processing" | "confirm_phone" | "verifying" | "success" | "error";

function makeOrderId() {
  return ("BH-CR-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8)).toUpperCase();
}

export default function CreditPaymentModal({ open, onClose, pack, onSuccess }: CreditPaymentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");
  const [wallet, setWallet] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [payId, setPayId] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [rawStatus, setRawStatus] = useState("");
  const [creditedAmount, setCreditedAmount] = useState(0);
  const verifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      clearInterval(verifyIntervalRef.current!);
      setStep("form");
      setWallet("");
      setServiceId("");
      setOtp("");
      setErrorMsg("");
      setOrderId("");
      setPayId("");
      setAttempts(0);
      setRawStatus("");
      setCreditedAmount(0);
    }
  }, [open]);

  if (!open) return null;

  const totalCredits = pack.total ?? pack.credits;
  const selectedNetwork = SOLEASPAY_NETWORKS.find((n) => String(n.id) === serviceId);

  const startPayment = async () => {
    if (!user) return;
    if (!wallet.trim() || !serviceId) {
      toast({ title: "Champs requis", description: "Remplissez le numéro et le réseau.", variant: "destructive" });
      return;
    }

    setStep("processing");
    setErrorMsg("");
    const oid = makeOrderId();
    setOrderId(oid);

    try {
      const raw = await initiatePayin({
        wallet: wallet.trim(),
        amount: pack.amountXAF,
        currency: "XAF",
        order_id: oid,
        description: `BotHoster — ${totalCredits} crédits (${pack.name})`,
        payer: user.email?.split("@")[0] ?? "client",
        payerEmail: user.email ?? "",
        service: Number(serviceId),
        otp: otp.trim() || undefined,
      });

      const reference = extractReference(raw);
      const status = extractStatus(raw);
      if (reference) setPayId(reference);

      if (isSuccess(status)) {
        await confirmCredits(oid, reference);
        return;
      }

      const hasError = raw?.success === false && !reference;
      if (hasError) {
        throw new Error(raw?.message ?? raw?.data?.message ?? "Erreur lors de l'initiation du paiement");
      }

      setStep("confirm_phone");
      startVerifyLoop(oid, reference, Number(serviceId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const startVerifyLoop = (oid: string, pid: string, svcId: number) => {
    let count = 0;
    const MAX = 36;
    verifyIntervalRef.current = setInterval(async () => {
      count++;
      setAttempts(count);

      if (!pid) {
        if (count >= MAX) {
          clearInterval(verifyIntervalRef.current!);
          setErrorMsg("Délai dépassé. Si vous avez payé, contactez le support.");
          setStep("error");
        }
        return;
      }

      try {
        const raw = await verifyPayment(oid, pid, svcId);
        const status = extractStatus(raw);
        setRawStatus(status);

        if (isSuccess(status)) {
          clearInterval(verifyIntervalRef.current!);
          await confirmCredits(oid, pid);
        } else if (isFailure(status)) {
          clearInterval(verifyIntervalRef.current!);
          setErrorMsg("Le paiement a échoué ou été annulé. Réessayez.");
          setStep("error");
        } else if (count >= MAX) {
          clearInterval(verifyIntervalRef.current!);
          setErrorMsg("Délai dépassé (3 min). Si vous avez payé, contactez le support avec la référence ci-dessous.");
          setStep("error");
        }
      } catch {
        if (count >= MAX) {
          clearInterval(verifyIntervalRef.current!);
          setErrorMsg("Impossible de vérifier le paiement. Vérifiez votre connexion.");
          setStep("error");
        }
      }
    }, 5000);
  };

  const confirmCredits = async (oid: string, pid: string) => {
    try {
      const result = await creditsApi.soleasPayConfirm(pack.id, oid, pid);
      setCreditedAmount(result.credited ?? totalCredits);
      setStep("success");
      onSuccess(result.balance);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setErrorMsg("Paiement reçu mais erreur d'activation. Contactez le support avec la référence.\n" + msg);
      setStep("error");
    }
  };

  const manualVerify = async () => {
    if (!orderId || !payId) {
      toast({ title: "Référence manquante", description: "Aucune référence de transaction disponible.", variant: "destructive" });
      return;
    }
    const prev = step;
    setStep("verifying");
    try {
      const raw = await verifyPayment(orderId, payId, Number(serviceId));
      const status = extractStatus(raw);
      setRawStatus(status);

      if (isSuccess(status)) {
        clearInterval(verifyIntervalRef.current!);
        await confirmCredits(orderId, payId);
      } else {
        setStep(prev);
        const displayStatus = status || "EN_ATTENTE";
        toast({
          title: "Paiement pas encore confirmé",
          description: `Statut SoleasPay : ${displayStatus}. Confirmez sur votre téléphone puis réessayez.`,
          variant: "destructive",
        });
      }
    } catch {
      setStep(prev);
      toast({ title: "Erreur de vérification", description: "Réessayez dans quelques secondes.", variant: "destructive" });
    }
  };

  const title = step === "success" ? "Crédits ajoutés !" : `Acheter — Pack ${pack.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading font-semibold text-lg">{title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step === "form" && `${pack.amountXAF.toLocaleString("fr-FR")} FCFA via Mobile Money (SoleasPay)`}
                {step === "processing" && "Initiation du paiement..."}
                {step === "confirm_phone" && "Confirmez le paiement sur votre téléphone"}
                {step === "verifying" && "Vérification en cours..."}
                {step === "success" && `${creditedAmount} crédits ajoutés à votre compte.`}
                {step === "error" && "Une erreur est survenue"}
              </p>
            </div>
            {(step === "form" || step === "error" || step === "success") && (
              <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Formulaire ── */}
          {step === "form" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                <Coins className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold text-primary text-lg">{totalCredits} crédits</p>
                  <p className="text-xs text-muted-foreground">{pack.price}€ — {pack.amountXAF.toLocaleString("fr-FR")} FCFA</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Réseau Mobile Money</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-input divide-y divide-border bg-background">
                  {SOLEASPAY_NETWORKS.map((n) => {
                    const selected = String(n.id) === serviceId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setServiceId(String(n.id))}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                          selected ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary/50 text-foreground"
                        }`}
                      >
                        <span>{n.name}</span>
                        <span className={`text-xs ${selected ? "text-primary" : "text-muted-foreground"}`}>{n.country}</span>
                      </button>
                    );
                  })}
                </div>
                {!serviceId && (
                  <p className="text-xs text-muted-foreground">Faites défiler et sélectionnez votre réseau</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet-cr">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wallet-cr"
                    className="pl-9"
                    placeholder="ex: 690000001"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                  />
                </div>
              </div>

              {selectedNetwork?.id === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="otp-cr">Code OTP Orange Money (optionnel)</Label>
                  <Input
                    id="otp-cr"
                    placeholder="ex: 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}

              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary">
                Vous serez débité de <strong>{pack.amountXAF.toLocaleString("fr-FR")} FCFA</strong> sur le numéro renseigné.
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="button" variant="hero" className="flex-1" onClick={startPayment}>
                  Payer maintenant
                </Button>
              </div>
            </div>
          )}

          {/* ── Traitement / Vérification ── */}
          {(step === "processing" || step === "verifying") && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm text-center">
                {step === "processing" ? "Envoi de la demande de paiement en cours..." : "Vérification du paiement..."}
              </p>
              <p className="text-xs text-muted-foreground text-center">Veuillez patienter, ne fermez pas cette page.</p>
            </div>
          )}

          {/* ── Confirmation téléphone ── */}
          {step === "confirm_phone" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-14 w-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                  <Phone className="h-7 w-7 text-yellow-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold">Confirmez sur votre téléphone</p>
                  <p className="text-sm text-muted-foreground">
                    Acceptez la demande de <strong>{pack.amountXAF.toLocaleString("fr-FR")} FCFA</strong> sur le <strong>{wallet}</strong>.
                  </p>
                </div>
              </div>

              {payId && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <div><span className="font-medium">Référence :</span> {payId}</div>
                  {rawStatus && <div><span className="font-medium">Statut :</span> {rawStatus}</div>}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Vérification automatique... ({attempts}/36)
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Fermer
                </Button>
                <Button type="button" variant="hero" className="flex-1" onClick={manualVerify}>
                  Vérifier maintenant
                </Button>
              </div>
            </div>
          )}

          {/* ── Succès ── */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="h-9 w-9 text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-primary text-2xl">+{creditedAmount} crédits</p>
                <p className="text-sm text-muted-foreground">Votre solde a été mis à jour avec succès !</p>
              </div>
              <Button type="button" variant="hero" className="w-full" onClick={onClose}>
                Fermer
              </Button>
            </div>
          )}

          {/* ── Erreur ── */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-sm text-muted-foreground whitespace-pre-line">{errorMsg}</p>
              </div>
              {payId && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground break-all">
                  <span className="font-medium">Référence :</span> {payId}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Fermer
                </Button>
                <Button type="button" variant="hero" className="flex-1" onClick={() => { setStep("form"); setErrorMsg(""); }}>
                  Réessayer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
