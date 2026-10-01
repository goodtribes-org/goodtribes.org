// Same light grey line as the left menu's edge (#E2E2E0), on every page.
export default function SiteFooter({ children }: { children: React.ReactNode }) {
  return <footer className="shrink-0 border-t border-[#E2E2E0] bg-[#FBFBF9]">{children}</footer>;
}
