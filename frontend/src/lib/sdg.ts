export const SDG_LABELS_SV: Record<number, string> = {
  1: "Ingen fattigdom",
  2: "Ingen hunger",
  3: "God hälsa och välbefinnande",
  4: "God utbildning",
  5: "Jämställdhet",
  6: "Rent vatten och sanitet",
  7: "Hållbar energi för alla",
  8: "Anständiga arbetsvillkor och ekonomisk tillväxt",
  9: "Hållbar industri, innovationer och infrastruktur",
  10: "Minskad ojämlikhet",
  11: "Hållbara städer och samhällen",
  12: "Hållbar konsumtion och produktion",
  13: "Bekämpa klimatförändringen",
  14: "Hav och marina resurser",
  15: "Ekosystem och biologisk mångfald",
  16: "Fredliga och inkluderande samhällen",
  17: "Genomförande och globalt partnerskap",
  18: "Sustainable Development Goals",
};

export const SDG_LABELS_EN: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Industry & Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace & Justice",
  17: "Partnerships",
  18: "GoodTribes",
};

export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

export const SDG_NUMBERS = Array.from({ length: 17 }, (_, i) => i + 1);

export function sdgIconPath(n: number): string {
  return `/SDG/sdg-${String(n).padStart(2, "0")}.png`;
}
