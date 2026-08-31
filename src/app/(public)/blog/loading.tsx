export default function SiteLoading() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1A1A2E]/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#F59E0B]" />
        <p className="text-sm text-gray-500">Yükleniyor…</p>
      </div>
    </div>
  );
}
