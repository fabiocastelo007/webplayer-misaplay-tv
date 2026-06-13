// Misaplay branding, contacts and plans.

export const BRAND = {
  name: "Misaplay TV",
  site: "www.misaplay.site",
  email: "suporte@misaplay.site",
  phone: "+244 912 083 163",
  phoneRaw: "244912083163",
  whatsapp: "244912083163",
};

export type Plan = {
  id: string;
  label: string;
  months: number;
  price: number; // Kz
};

export const PLANS: Plan[] = [
  { id: "mensal", label: "Mensal", months: 1, price: 5000 },
  { id: "trimestral", label: "Trimestral", months: 3, price: 14000 },
  { id: "semestral", label: "Semestral", months: 6, price: 28000 },
  { id: "anual", label: "Anual", months: 12, price: 56000 },
];

export function formatKz(n: number) {
  return new Intl.NumberFormat("pt-AO").format(n) + " Kz";
}

export function whatsappRenewalLink(opts: {
  username: string;
  plan: Plan;
  pkg: "MAX" | "PREMIUM";
}) {
  const pkgName = opts.pkg === "MAX" ? "Pacote Max" : "Pacote Premium";
  const msg =
    `Olá Misaplay TV! Quero RENOVAR a minha assinatura.%0A` +
    `• Usuário: ${encodeURIComponent(opts.username)}%0A` +
    `• Pacote actual: ${encodeURIComponent(pkgName)}%0A` +
    `• Plano escolhido: ${encodeURIComponent(opts.plan.label)} (${opts.plan.months} ${
      opts.plan.months === 1 ? "mês" : "meses"
    }) — ${encodeURIComponent(formatKz(opts.plan.price))}%0A` +
    `Aguardo confirmação. Obrigado!`;
  return `https://wa.me/${BRAND.whatsapp}?text=${msg}`;
}
