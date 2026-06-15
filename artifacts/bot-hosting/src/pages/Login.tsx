import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Bot, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, login } = useAuth();

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
    if (!email || !password) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Connecté", description: "Bienvenue sur BotHoster !" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Identifiants incorrects.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-heading">Bot<span className="text-primary">Hoster</span></span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold font-heading mb-2 text-center">Connexion</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Accédez à votre dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-border accent-primary" />
                Se souvenir de moi
              </label>
            </div>

            <Button variant="hero" className="w-full" type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
