import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { subscriptionApi, type Subscription } from "@/lib/api";

const PLANS = [
  {
    id: "free", name: "Gratuit", price: "0€", period: "/mois",
    features: ["1 bot", "308 MB RAM", "Support communauté"],
    color: "border-border",
  },
  {
    id: "standard", name: "Standard", price: "5€", period: "/mois",
    features: ["3 bots", "700 MB RAM", "Support email"],
    color: "border-primary/50",
  },
  {
    id: "pro", name: "Pro", price: "12€", period: "/mois",
    features: ["5 bots", "1024 MB RAM", "Support prioritaire"],
    color: "border-primary",
    highlighted: true,
  },
  {
    id: "business", name: "Business", price: "30€", period: "/mois",
    features: ["Bots illimités", "4096 MB RAM", "Support dédié"],
    color: "border-border",
  },
];

const Subscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    subscriptionApi.get()
      .then(setSubscription)
      .catch(() => toast({ title: "Erreur", description: "Impossible de charger l'abonnement.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentPlan = subscription?.plan || "free";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading">Abonnement</h1>
        <p className="text-muted-foreground mt-1">Gérez votre plan BotHoster.</p>
      </div>

      {subscription && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
          <CreditCard className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">Plan actuel : <span className="text-primary">{currentPlan === "free" ? "Gratuit" : currentPlan.charAt(0).toUpperCase()+currentPlan.slice(1)}</span></p>
            <p className="text-sm text-muted-foreground">{subscription.ram_limit} MB RAM</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`rounded-xl border ${plan.highlighted ? "border-primary" : "border-border"} bg-card p-6 space-y-4 relative`}>
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Populaire
              </div>
            )}
            <div>
              <h3 className="font-bold font-heading text-lg">{plan.name}</h3>
              <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {currentPlan === plan.id ? (
              <div className="w-full text-center py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg">Plan actuel</div>
            ) : (
              <Button variant={plan.highlighted ? "hero" : "outline"} className="w-full" onClick={() => {
                toast({ title: "Paiement", description: `Contactez le support pour passer au plan ${plan.name}.` });
              }}>
                Choisir ce plan
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;
