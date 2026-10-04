export type WalletTemplateType = "BANK" | "E_WALLET";

export interface WalletTemplate {
  id: string;
  name: string;
  type: WalletTemplateType;
  color: string;
}

export interface WalletTemplateGroup {
  key: string;
  label: string;
  description: string;
  templates: WalletTemplate[];
}

const bank = (id: string, name: string, color: string): WalletTemplate => ({
  id,
  name,
  type: "BANK",
  color,
});

const ewallet = (id: string, name: string, color: string): WalletTemplate => ({
  id,
  name,
  type: "E_WALLET",
  color,
});

const rdn = (id: string, name: string, color: string): WalletTemplate => ({
  id,
  name: `RDN ${name}`,
  type: "BANK",
  color,
});

/**
 * `color` diisi dengan warna brand yang umum dipakai publik untuk tiap
 * institusi — hanya sebagai pembeda visual di daftar dompet, bukan nilai
 * resmi dari masing-masing bank.
 */
export const WALLET_TEMPLATE_GROUPS: WalletTemplateGroup[] = [
  {
    key: "bank",
    label: "Bank Populer",
    description: "Rekening tabungan & giro bank Indonesia",
    templates: [
      bank("bank-bri", "BRI", "#007A3D"),
      bank("bank-bca", "BCA", "#00579C"),
      bank("bank-mandiri", "Mandiri", "#0072CE"),
      bank("bank-bni", "BNI", "#EE3124"),
      bank("bank-bjb", "BJB", "#00A19A"),
      bank("bank-bsri", "Bank Syariah", "#00863E"),
      bank("bank-permata", "Permata", "#6C2E91"),
      bank("bank-danamon", "Danamon", "#0C4B8C"),
      bank("bank-cimb", "CIMB Niaga", "#C41E3A"),
      bank("bank-maybank", "Maybank", "#0A4D8C"),
      bank("bank-btpn", "BTPN", "#1E4C9A"),
      bank("bank-mega", "Mega", "#0B4EA2"),
      bank("bank-bukopin", "Bukopin", "#C8102E"),
      bank("bank-panin", "Panin", "#004B87"),
      bank("bank-jago", "Jago", "#2D2A6E"),
      bank("bank-dbs", "DBS", "#E60028"),
    ],
  },
  {
    key: "ewallet",
    label: "E-Wallet Populer",
    description: "Dompet digital & mobile payment",
    templates: [
      ewallet("ewallet-gopay", "GoPay", "#00A99D"),
      ewallet("ewallet-ovo", "OVO", "#5A31F4"),
      ewallet("ewallet-dana", "DANA", "#1188C7"),
      ewallet("ewallet-shoopeepay", "ShopeePay", "#EE4D2D"),
      ewallet("ewallet-linkaja", "LinkAja", "#00A88F"),
      ewallet("ewallet-qris", "QRIS", "#1A2E6E"),
      ewallet("ewallet-jenius", "Jenius", "#0B5ED7"),
      ewallet("ewallet-bliblipay", "BlibliPay", "#1A2E6E"),
    ],
  },
  {
    key: "rdn",
    label: "RDN Populer",
    description: "Rekening Dana Nasabah di bank administrator RDN (KSEI 2024–2029)",
    templates: [
      rdn("rdn-bca", "BCA", "#00579C"),
      rdn("rdn-mandiri", "Mandiri", "#0072CE"),
      rdn("rdn-bni", "BNI", "#EE3124"),
      rdn("rdn-bri", "BRI", "#007A3D"),
      rdn("rdn-cimb", "CIMB Niaga", "#C41E3A"),
      rdn("rdn-permata", "Permata", "#6C2E91"),
      rdn("rdn-bsri", "Bank Syariah", "#00863E"),
      rdn("rdn-bjb", "BJB", "#00A19A"),
      rdn("rdn-bca-syariah", "BCA Syariah", "#008A4E"),
      rdn("rdn-dbs", "DBS", "#E60028"),
      rdn("rdn-maybank", "Maybank", "#0A4D8C"),
      rdn("rdn-sinarmas", "Sinarmas", "#1B3C93"),
      rdn("rdn-mega", "Mega", "#0B4EA2"),
      rdn("rdn-jago", "Jago", "#2D2A6E"),
      rdn("rdn-ocbc-nisp", "OCBC NISP", "#DA291C"),
      rdn("rdn-panin", "Panin", "#004B87"),
      rdn("rdn-bukopin", "Bukopin", "#C8102E"),
      rdn("rdn-allo", "Allo Bank", "#E4002B"),
      rdn("rdn-capital", "Bank Capital", "#009B48"),
      rdn("rdn-bca-digital", "Bank Digital BCA", "#00579C"),
    ],
  },
];

export function flattenWalletTemplates(): WalletTemplate[] {
  return WALLET_TEMPLATE_GROUPS.flatMap((group) => group.templates);
}
