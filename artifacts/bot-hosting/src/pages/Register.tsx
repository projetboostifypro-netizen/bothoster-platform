import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Bot, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, register } = useAuth();

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmPassword,
  }), [password, confirmPassword]);

  const isValid = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return emailValid && username.trim().length > 0 && passwordChecks.length && passwordChecks.uppercase && passwordChecks.number && passwordChecks.match;
  }, [email, username, passwordChecks]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast({ title: "Erreur", description: "Veuillez corriger les erreurs.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register(email, password, username);
      toast({ title: "Compte créé !", description: "Bienvenue sur BotHoster !" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer le compte.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const CheckItem = ({ ok, text }: { ok: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3 text-muted-foreground" />}
      <span className={ok ? "text-primary" : "text-muted-foreground"}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-heading">Bot<span className="text-primary">Hoster</span></span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold font-heading mb-2 text-center">Créer un compte</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Déployez votre premier bot en minutes</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input id="username" placeholder="votre-pseudo" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            {password.length > 0 && (
              <div className="space-y-1 p-3 rounded-lg bg-secondary">
                <CheckItem ok={passwordChecks.length} text="Au moins 8 caractères" />
                <CheckItem ok={passwordChecks.uppercase} text="Une majuscule" />
                <CheckItem ok={passwordChecks.number} text="Un chiffre" />
                <CheckItem ok={passwordChecks.match} text="Les mots de passe correspondent" />
              </div>
            )}

            <Button variant="hero" className="w-full" type="submit" disabled={loading || !isValid}>
              {loading ? "Création..." : "Créer un compte"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
