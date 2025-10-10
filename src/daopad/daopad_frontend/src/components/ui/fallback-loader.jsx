export function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-executive-charcoal">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-executive-gold/20 border-t-executive-gold rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-executive-lightGray">Loading...</p>
      </div>
    </div>
  );
}
