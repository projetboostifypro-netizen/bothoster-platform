import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { Loader2, User, Lock, ShieldAlert, BadgeCheck, Calendar } from "lucide-react";

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profil
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim() && !email.trim()) return;
    setSavingProfile(true);
    try {
      await authApi.updateProfile({ name: name.trim(), email: email.trim() });
      await refreshUser();
      toast({ title: "Profil mis à jour", description: "Vos informations ont été sauvegardées." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mots de passe différents", description: "Le nouveau mot de passe et sa confirmation ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Trop court", description: "Le nouveau mot de passe doit faire au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour avec succès." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-heading">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez votre compte et vos préférences.</p>
      </div>

      {/* Carte résumé compte */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary font-heading flex-shrink-0">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold font-heading truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <BadgeCheck className="h-3.5 w-3.5" />
              {user.role === "admin" ? "Administrateur" : "Utilisateur"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Membre depuis {new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Informations du profil */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-semibold font-heading">Informations du profil</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom d'affichage</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <Button
          variant="hero"
          onClick={saveProfile}
          disabled={savingProfile || (name === user.name && email === user.email)}
        >
          {savingProfile ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
          ) : (
            "Sauvegarder les modifications"
          )}
        </Button>
      </div>

      {/* Changer le mot de passe */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold font-heading">Changer le mot de passe</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={changePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
        >
          {savingPassword ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mise à jour...</>
          ) : (
            "Changer le mot de passe"
          )}
        </Button>
      </div>

      {/* Zone dangereuse */}
      <div className="rounded-xl border border-destructive/30 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h2 className="font-semibold font-heading text-destructive">Zone dangereuse</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          La suppression définitive de votre compte supprimera tous vos bots, fichiers et données associées. Cette action est irréversible.
        </p>
        <Button
          variant="destructive"
          onClick={() => toast({
            title: "Contactez le support",
            description: "Pour supprimer votre compte, contactez-nous via le support.",
            variant: "destructive",
          })}
        >
          Supprimer mon compte
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
