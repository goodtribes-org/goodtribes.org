import { prisma } from "@/lib/prisma";
import ShopItemsEditor from "./ShopItemsEditor";

export default async function ShopAdminPage() {
  const items = await prisma.shopItem.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Shop</h1>
        <p className="text-sm text-dark-slate/60 mt-1">Hantera varor som kan lösas in mot GT.</p>
      </div>
      <ShopItemsEditor initialItems={items} />
    </div>
  );
}
