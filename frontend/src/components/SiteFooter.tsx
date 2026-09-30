// Same green line as under the header, on every page (Sandbox included).
export default function SiteFooter({ children }: { children: React.ReactNode }) {
  return <footer className="shrink-0 border-t border-seagrass bg-[#FBFBF9]">{children}</footer>;
}
