import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medlemmar — GoodTribes.org",
  description: "Vad du kan göra som medlem i GoodTribes.org",
};

export default function MembersPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Våra medlemmar</h1>
      <p className="text-lg text-gray-600">
        Här kommer vi snart att visa vad du kan göra som medlem i GoodTribes.org.
      </p>
    </div>
  );
}
