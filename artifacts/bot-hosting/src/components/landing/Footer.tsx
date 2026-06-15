

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BotHoster" className="h-7 w-7 rounded-md object-contain" />
            <span className="font-bold font-heading">Bot<span className="text-primary">Hoster</span></span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 BotHoster. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
