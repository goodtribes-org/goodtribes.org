// The line under the header: the same light grey as the left menu's edge and
// the line above the footer (#E2E2E0), on every page.
export default function SiteHeader({ children }: { children: React.ReactNode }) {
  return <header className="relative z-30 bg-white/90 border-b border-[#E2E2E0] shrink-0">{children}</header>;
}
