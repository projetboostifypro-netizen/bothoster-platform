import { Bot, Cloud, Shield, Activity, Upload, CreditCard } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Déploiement simple",
    description: "Uploadez votre bot via GitHub, ZIP ou lien direct. Support Node.js, Python et plus.",
  },
  {
    icon: Activity,
    title: "Monitoring temps réel",
    description: "Suivez CPU, RAM et uptime. Logs en temps réel pour chaque bot.",
  },
  {
    icon: Cloud,
    title: "Hébergement 24/7",
    description: "Vos bots restent en ligne en permanence sur une infrastructure fiable.",
  },
  {
    icon: Shield,
    title: "Sécurité avancée",
    description: "Isolation par processus, JWT, protection contre les abus et limitation des ressources.",
  },
  {
    icon: Bot,
    title: "Multi-plateforme",
    description: "Discord, Telegram, WhatsApp et scripts automatisés — tout au même endroit.",
  },
  {
    icon: CreditCard,
    title: "Plans flexibles",
    description: "Commencez gratuitement et passez au premium quand vous en avez besoin.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
            Tout ce qu'il faut pour vos <span className="text-primary">bots</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Une plateforme complète pour héberger, gérer et surveiller vos bots.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold font-heading mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
