export const metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto text-center py-24">
      <h1 className="text-2xl font-bold text-dark-slate mb-3">You&apos;re offline</h1>
      <p className="text-dark-slate/70">
        This page hasn&apos;t been saved for offline use yet. Reconnect to the internet and try again.
      </p>
    </div>
  );
}
