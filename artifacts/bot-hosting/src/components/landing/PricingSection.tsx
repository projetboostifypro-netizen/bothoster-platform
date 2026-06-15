import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Gratuit",
    price: "0 FCFA",
    period: "/mois",
    description: "Pour tester et découvrir",
    validity: "Valide 14 jours",
    features: ["1 bot", "200 MB RAM", "200 MB stockage", "25% CPU", "Logs basiques"],
    cta: "Commencer",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "750 FCFA",
    period: "/mois",
    description: "Pour les développeurs",
    validity: "Renouvellement mensuel",
    features: ["3 bots", "700 MB RAM", "Logs temps réel", "Variables d'env", "Support prioritaire"],
    cta: "Choisir Standard",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "1 200 FCFA",
    period: "/mois",
    description: "Pour les projets actifs",
    validity: "Renouvellement mensuel",
    features: ["5 bots", "1 GB RAM", "Logs temps réel", "Variables d'env", "Support prioritaire", "Hébergement 24/7"],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "2 500 FCFA",
    period: "/mois",
    description: "Pour les équipes et entreprises",
    validity: "Renouvellement mensuel",
    features: ["Bots illimités", "4 GB RAM", "Dashboard admin", "API accès", "Support dédié", "SLA 99.9%"],
    cta: "Choisir Business",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
            Des <span className="text-primary">tarifs</span> simples
          </h2>
          <p className="text-muted-foreground text-lg">Commencez gratuitement, évoluez selon vos besoins.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col transition-transform hover:-translate-y-1 duration-200 ${
                plan.highlighted
                  ? "border-primary bg-card box-glow"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 self-start mb-3">
                  Populaire
                </div>
              )}
              <h3 className="text-xl font-bold font-heading mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-1">{plan.description}</p>
              <p className="text-xs text-primary/80 mb-4">{plan.validity}</p>
              <div className="mb-6">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant={plan.highlighted ? "hero" : "outline"} className="w-full" asChild>
                <Link to="/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
