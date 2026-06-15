import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  initiatePayin, verifyPayment,
  extractReference, extractStatus,
  isSuccess, isFailure,
  SOLEASPAY_NETWORKS,
} from "@/lib/soleaspay";
import { CheckCircle, Loader2, AlertCircle, Phone, RefreshCw } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: { id: string; name: string; price: string; amount: number };
  onSuccess: () => void;
}


type Step = "form" | "processing" | "confirm_phone" | "verifying" | "success" | "error";

function makeOrderId() {
  return ("BH-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8)).toUpperCase();
}

export default function PaymentModal({ open, onClose, plan, onSuccess }: PaymentModalProps) {
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
    }
  }, [open]);

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
        amount: plan.amount,
        currency: "XAF",
        order_id: oid,
        description: `BotHoster abonnement ${plan.name}`,
        payer: user.email?.split("@")[0] ?? "client",
        payerEmail: user.email ?? "",
        service: Number(serviceId),
        otp: otp.trim() || undefined,
      });

      const reference = extractReference(raw);
      const status = extractStatus(raw);
      if (reference) setPayId(reference);

      // Si déjà en succès à l'initiation (rare mais possible)
      if (isSuccess(status)) {
        await activatePlan(oid, reference);
        return;
      }

      // Si erreur explicite sans référence
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
    const MAX = 36; // 3 minutes
    verifyIntervalRef.current = setInterval(async () => {
      count++;
      setAttempts(count);

      if (!pid) {
        // Pas de payId → on attend encore
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
          await activatePlan(oid, pid);
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

  const activatePlan = async (_oid: string, _pid: string) => {
    if (!user) return;
    try {
      await subscriptionApi.activate(plan.id);
      setStep("success");
      onSuccess();
    } catch {
      setErrorMsg("Paiement reçu mais erreur d'activation. Contactez le support avec la référence.");
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
      console.log("[manualVerify] raw:", JSON.stringify(raw), "status:", status);

      if (isSuccess(status)) {
        clearInterval(verifyIntervalRef.current!);
        await activatePlan(orderId, payId);
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {step === "success" ? "Paiement confirmé !" : `Passer au plan ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && `${plan.amount.toLocaleString("fr-FR")} FCFA / mois via Mobile Money`}
            {step === "processing" && "Initiation du paiement..."}
            {step === "confirm_phone" && "Confirmez le paiement sur votre téléphone"}
            {step === "verifying" && "Vérification en cours..."}
            {step === "success" && `Plan ${plan.name} activé avec succès.`}
            {step === "error" && "Une erreur est survenue"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Formulaire ─────────────────────────────────── */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Réseau Mobile Money</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger data-testid="trigger-network">
                  <SelectValue placeholder="Choisir un réseau..." />
                </SelectTrigger>
                <SelectContent>
                  {SOLEASPAY_NETWORKS.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.name} — {n.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="wallet"
                  className="pl-9"
                  placeholder="ex: 690000001"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  data-testid="input-wallet"
                />
              </div>
            </div>

            {selectedNetwork?.id === 2 && (
              <div className="space-y-2">
                <Label htmlFor="otp">Code OTP Orange Money (optionnel)</Label>
                <Input
                  id="otp"
                  placeholder="ex: 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  data-testid="input-otp"
                />
              </div>
            )}

            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary">
              Vous serez débité de <strong>{plan.amount.toLocaleString("fr-FR")} FCFA</strong> sur le numéro renseigné.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-cancel-payment">
                Annuler
              </Button>
              <Button variant="hero" className="flex-1" onClick={startPayment} data-testid="button-confirm-payment">
                Payer maintenant
              </Button>
            </div>
          </div>
        )}

        {/* ── Chargement ─────────────────────────────────── */}
        {(step === "processing" || step === "verifying") && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm text-center">
              {step === "processing" ? "Envoi de la demande de paiement..." : "Vérification du paiement..."}
            </p>
          </div>
        )}

        {/* ── Confirmation téléphone ─────────────────────── */}
        {step === "confirm_phone" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <Phone className="h-7 w-7 text-yellow-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Confirmez sur votre téléphone</p>
                <p className="text-sm text-muted-foreground">
                  Acceptez la demande de <strong>{plan.amount.toLocaleString("fr-FR")} FCFA</strong> sur le <strong>{wallet}</strong>.
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
              <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-close-pending">
                Fermer
              </Button>
              <Button variant="hero" className="flex-1" onClick={manualVerify} data-testid="button-check-payment">
                Vérifier maintenant
              </Button>
            </div>
          </div>
        )}

        {/* ── Succès ─────────────────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-center text-sm text-muted-foreground">
              Votre plan <strong>{plan.name}</strong> est maintenant actif !
            </p>
            <Button variant="hero" className="w-full" onClick={onClose} data-testid="button-close-success">
              Fermer
            </Button>
          </div>
        )}

        {/* ── Erreur ─────────────────────────────────────── */}
        {step === "error" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            {payId && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground break-all">
                <span className="font-medium">Référence :</span> {payId}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-close-error">
                Fermer
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => { setStep("form"); setErrorMsg(""); }} data-testid="button-retry-payment">
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
