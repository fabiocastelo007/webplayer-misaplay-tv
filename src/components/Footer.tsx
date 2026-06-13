import { Mail, Phone, Globe, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-background/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            {BRAND.name} — filmes, séries, TV ao vivo e desporto em um só lugar.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">
            Contactos
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href={`https://wa.me/${BRAND.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <MessageCircle className="size-4" /> {BRAND.phone}
              </a>
            </li>
            <li>
              <a href={`tel:+${BRAND.phoneRaw}`} className="inline-flex items-center gap-2 hover:text-foreground">
                <Phone className="size-4" /> {BRAND.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${BRAND.email}`} className="inline-flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" /> {BRAND.email}
              </a>
            </li>
            <li>
              <a
                href={`https://${BRAND.site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <Globe className="size-4" /> {BRAND.site}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">
            Suporte
          </h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Renovações, dúvidas e suporte técnico via WhatsApp todos os dias das 08h às 22h.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND.name}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
