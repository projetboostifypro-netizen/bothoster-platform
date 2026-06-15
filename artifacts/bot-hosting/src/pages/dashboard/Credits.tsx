import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { creditsApi, type CreditData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Coins, Zap, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Gift, Loader2, Smartphone,
} from "lucide-react";
import CreditPaymentModal from "@/components/dashboard/CreditPaymentModal";

const PLAN_CREDITS: Record<string, number> = {
  free: 0,
  standard: 500,
  pro: 1200,
  business: 3000,
};

// 1€ ≈ 655.957 XAF (cours fixe zone CFA)
const PACKS = [
  {
    id: "starter",
    name: "Starter",
    credits: 500,
    bonus: 0,
    price: 5,
    amountXAF: 3280,
    color: "border-border",
    description: "Idéal pour démarrer",
    highlighted: false,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 1000,
    bonus: 100,
    total: 1100,
    price: 10,
    amountXAF: 6560,
    color: "border-primary/50",
    description: "+100 crédits bonus",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2500,
    bonus: 300,
    total: 2800,
    price: 25,
    amountXAF: 16400,
    color: "border-primary/70",
    description: "+300 crédits bonus",
    highlighted: true,
  },
  {
    id: "max",
    name: "Max",
    credits: 5500,
    bonus: 500,
    total: 6000,
    price: 50,
    amountXAF: 32800,
    color: "border-border",
    description: "+500 crédits bonus",
    highlighted: false,
  },
];

const TransactionIcon = ({ type }: { type: string }) => {
  if (type === "purchase" || type === "admin_gift" || type === "auto_recharge") {
    return <ArrowUpRight className="h-4 w-4 text-green-400" />;
  }
  return <ArrowDownRight className="h-4 w-4 text-red-400" />;
};

const Credits = () => {
  const [data, setData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAR, setSavingAR] = useState(false);
  const [arEnabled, setArEnabled] = useState(false);
  const [arThreshold, setArThreshold] = useState("100");
  const [arAmount, setArAmount] = useState("500");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<typeof PACKS[0] | null>(null);

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const d = await creditsApi.get();
      setData(d);
      setArEnabled(d.auto_recharge === 1);
      setArThreshold(String(d.auto_recharge_threshold));
      setArAmount(String(d.auto_recharge_amount));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (pack: typeof PACKS[0]) => {
    setSelectedPack(pack);
    setModalOpen(true);
  };

  const handlePaymentSuccess = (newBalance: number) => {
    setData((prev) => prev ? { ...prev, balance: newBalance } : prev);
    fetchData();
  };

  const saveAutoRecharge = async () => {
    setSavingAR(true);
    try {
      await creditsApi.updateAutoRecharge(arEnabled, parseInt(arThreshold), parseInt(arAmount));
      toast({ title: "Recharge automatique mise à jour" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingAR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading">Crédits</h1>
        <p className="text-muted-foreground mt-1">
          Achetez des crédits via Mobile Money (SoleasPay) pour payer vos plans BotHoster.
        </p>
      </div>

      {/* Solde actuel */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Solde actuel</p>
            <p className="text-4xl font-bold font-heading text-primary">
              {data?.balance ?? 0}
              <span className="text-lg text-muted-foreground font-normal ml-1">crédits</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Équivalent</p>
          <p className="text-xl font-bold font-heading">
            {((data?.balance ?? 0) / 100).toFixed(2)}€
          </p>
        </div>
      </div>

      {/* Méthode de paiement */}
      <div className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Paiement via Mobile Money — SoleasPay</p>
          <p className="text-xs text-muted-foreground">
            Orange Money, MTN MoMo, Moov Money, Wave, Airtel… (Cameroun, Côte d'Ivoire, Bénin, Togo, RDC, Congo, Gabon, Ouganda)
          </p>
        </div>
      </div>

      {/* Tarifs des plans */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold font-heading flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Coût des plans (crédits/mois)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(PLAN_CREDITS).map(([plan, cost]) => (
            <div key={plan} className="rounded-lg bg-secondary/20 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground capitalize mb-1">{plan === "free" ? "Gratuit" : plan}</p>
              <p className="font-bold font-heading text-lg">{cost}</p>
              <p className="text-xs text-muted-foreground">crédits/mois</p>
            </div>
          ))}
        </div>
      </div>

      {/* Packs */}
      <div>
        <h2 className="font-semibold font-heading text-lg mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Acheter des crédits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKS.map((pack) => {
            const totalCredits = pack.total ?? pack.credits;
            return (
              <div
                key={pack.id}
                className={`rounded-xl border ${pack.highlighted ? "border-primary" : "border-border"} bg-card p-6 space-y-4 relative`}
              >
                {pack.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                    Meilleure valeur
                  </div>
                )}
                <div>
                  <h3 className="font-bold font-heading text-lg">{pack.name}</h3>
                  <p className="text-2xl font-bold mt-1">{pack.price}€</p>
                  <p className="text-xs text-muted-foreground">{pack.amountXAF.toLocaleString("fr-FR")} FCFA</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>
                      <span className="font-bold text-primary">{totalCredits}</span> crédits
                    </span>
                  </div>
                  {pack.bonus > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <Gift className="h-4 w-4 flex-shrink-0" />
                      <span>+{pack.bonus} crédits bonus</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">{pack.description}</p>
                </div>
                <Button
                  variant={pack.highlighted ? "hero" : "outline"}
                  className="w-full"
                  onClick={() => openModal(pack)}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Payer {pack.price}€
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recharge automatique */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold font-heading">Recharge automatique</h2>
              <p className="text-sm text-muted-foreground">
                Rechargez automatiquement quand votre solde est bas.
              </p>
            </div>
          </div>
          <Switch
            checked={arEnabled}
            onCheckedChange={setArEnabled}
            id="auto-recharge-switch"
          />
        </div>

        {arEnabled && (
          <div className="rounded-lg bg-secondary/20 p-4 space-y-4 border border-border">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ar-threshold" className="text-sm">
                  Recharger quand le solde passe en dessous de
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ar-threshold"
                    type="number"
                    value={arThreshold}
                    onChange={(e) => setArThreshold(e.target.value)}
                    min="0"
                    className="h-9"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">crédits</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ar-amount" className="text-sm">
                  Montant de la recharge automatique
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ar-amount"
                    type="number"
                    value={arAmount}
                    onChange={(e) => setArAmount(e.target.value)}
                    min="100"
                    className="h-9"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">crédits</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Exemple : si votre solde passe en dessous de {arThreshold} crédits, {arAmount} crédits seront automatiquement ajoutés.
            </p>
          </div>
        )}

        <Button onClick={saveAutoRecharge} disabled={savingAR} className="w-full sm:w-auto">
          {savingAR ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : "Enregistrer les paramètres"}
        </Button>
      </div>

      {/* Historique */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold font-heading">Historique des transactions</h2>
        </div>
        {!data?.transactions?.length ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Coins className="h-8 w-8 mx-auto mb-2 opacity-20" />
            Aucune transaction pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    <TransactionIcon type={tx.type} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-bold font-heading ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} crédits
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal paiement SoleasPay */}
      {selectedPack && (
        <CreditPaymentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          pack={selectedPack}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Credits;
