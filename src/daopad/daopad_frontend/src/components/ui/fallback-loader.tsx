export function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
