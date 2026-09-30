// The site's green line under the header, the same on every page (Sandbox
// included) and matching the line above the footer.
export default function SiteHeader({ children }: { children: React.ReactNode }) {
  return <header className="relative z-30 bg-white/90 border-b border-seagrass shrink-0">{children}</header>;
}
