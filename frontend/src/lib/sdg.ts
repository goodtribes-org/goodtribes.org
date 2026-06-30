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

export const SDG_UN_URLS: Record<number, string> = {
  1:  "https://www.un.org/sustainabledevelopment/poverty/",
  2:  "https://www.un.org/sustainabledevelopment/hunger/",
  3:  "https://www.un.org/sustainabledevelopment/health/",
  4:  "https://www.un.org/sustainabledevelopment/education/",
  5:  "https://www.un.org/sustainabledevelopment/gender-equality/",
  6:  "https://www.un.org/sustainabledevelopment/water-and-sanitation/",
  7:  "https://www.un.org/sustainabledevelopment/energy/",
  8:  "https://www.un.org/sustainabledevelopment/economic-growth/",
  9:  "https://www.un.org/sustainabledevelopment/infrastructure-industrialization/",
  10: "https://www.un.org/sustainabledevelopment/inequality/",
  11: "https://www.un.org/sustainabledevelopment/cities/",
  12: "https://www.un.org/sustainabledevelopment/sustainable-consumption-production/",
  13: "https://www.un.org/sustainabledevelopment/climate-change/",
  14: "https://www.un.org/sustainabledevelopment/oceans/",
  15: "https://www.un.org/sustainabledevelopment/biodiversity/",
  16: "https://www.un.org/sustainabledevelopment/peace-justice/",
  17: "https://www.un.org/sustainabledevelopment/globalpartnerships/",
  18: "https://www.un.org/sustainabledevelopment/sustainable-development-goals/",
};

export function sdgIconPath(n: number): string {
  return `/SDG/sdg-${String(n).padStart(2, "0")}.png`;
}

export function sdgIconPathDark(n: number): string {
  return `/SDG/sdgK-${String(n).padStart(2, "0")}.png`;
}
