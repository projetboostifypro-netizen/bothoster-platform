import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mail } from "lucide-react";

const WHATSAPP_NUMBER = "242050621851";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const Support = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Champs requis", description: "Veuillez remplir le sujet et le message.", variant: "destructive" });
      return;
    }
    const text = encodeURIComponent(`*Sujet :* ${subject}\n\n${message}`);
    window.open(`${WHATSAPP_URL}?text=${text}`, "_blank");
    toast({ title: "Redirection WhatsApp", description: "Votre message a été pré-rempli dans WhatsApp." });
    setSubject("");
    setMessage("");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-heading">Support</h1>
        <p className="text-muted-foreground mt-1">Besoin d'aide ? Notre équipe vous répond rapidement.</p>
      </div>

      {/* WhatsApp direct */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-whatsapp-direct"
        className="flex items-center gap-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors p-5 group"
      >
        <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <MessageCircle className="h-6 w-6 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground group-hover:text-green-400 transition-colors">Support WhatsApp</p>
          <p className="text-sm text-muted-foreground">+{WHATSAPP_NUMBER} — Réponse en quelques minutes</p>
        </div>
        <span className="text-xs font-medium text-green-400 bg-green-500/10 rounded-full px-3 py-1 shrink-0">
          Disponible
        </span>
      </a>

      {/* Formulaire → pré-remplit WhatsApp */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Envoyer un message détaillé</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Sujet</Label>
          <Input
            id="subject"
            placeholder="Problème avec mon bot"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            data-testid="input-support-subject"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <textarea
            id="message"
            rows={5}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Décrivez votre problème en détail..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="textarea-support-message"
          />
        </div>

        <Button variant="hero" type="submit" className="gap-2 w-full sm:w-auto" data-testid="button-send-support">
          <MessageCircle className="h-4 w-4" />
          Envoyer via WhatsApp
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        En cliquant sur "Envoyer via WhatsApp", votre application WhatsApp s'ouvrira avec votre message pré-rempli.
      </p>
    </div>
  );
};

export default Support;
