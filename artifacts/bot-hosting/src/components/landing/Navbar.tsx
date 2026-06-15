import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="BotHoster" className="h-9 w-9 rounded-md object-contain" />
          <span className="text-xl font-bold font-heading text-foreground">
            Bot<span className="text-primary">Hoster</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Connexion</Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/register">Commencer</Link>
          </Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">Fonctionnalités</a>
          <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">Tarifs</a>
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/login">Connexion</Link>
          </Button>
          <Button variant="hero" className="w-full" asChild>
            <Link to="/register">Commencer</Link>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
