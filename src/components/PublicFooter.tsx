import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold">
              <span className="font-display text-lg font-bold text-navy">S</span>
            </div>
            <span className="font-display text-lg font-semibold">Sterling Capital</span>
          </div>
          <p className="mt-3 text-sm text-navy-foreground/70">
            Building lasting wealth for our shareholders through disciplined investment.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-gold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-navy-foreground/80">
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/opportunity">Opportunity</Link></li>
            <li><Link to="/packages">Packages</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-gold">Investors</h4>
          <ul className="mt-3 space-y-2 text-sm text-navy-foreground/80">
            <li><Link to="/signup" search={{ ref: "" }}>Become an investor</Link></li>
            <li><Link to="/login">Investor login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-gold">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-navy-foreground/80">
            <li>Nairobi, Kenya</li>
            <li>investors@sterling.co.ke</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10 py-6 text-center text-xs text-navy-foreground/60">
        © {new Date().getFullYear()} Sterling Capital Holdings. All rights reserved.
      </div>
    </footer>
  );
}
