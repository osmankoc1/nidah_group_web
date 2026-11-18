"use client";

import { useState } from "react";
import { HelpCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Doğrulama durumu kontrolü — OEM numaraları ve makine uyumlulukları için ortak.
 *
 * KURAL (src/lib/verification.ts): "Doğrulandı" işaretlemek için KAYNAK
 * ZORUNLUDUR. Bu yüzden işaretlemeden önce kaynak alanı istenir; sunucu da
 * aynı kuralı bağımsızca uygular (istemciye güvenilmez).
 */
export default function VerificationControl({
  verified,
  source,
  applyChange,
}: {
  verified: boolean;
  source: string | null;
  /** `verified` ve `source` birlikte gönderilir. Hata mesajı döndürülür. */
  applyChange: (next: { verified: boolean; source: string }) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(source ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function apply(nextVerified: boolean, nextSource: string) {
    setBusy(true);
    setError("");
    const message = await applyChange({ verified: nextVerified, source: nextSource });
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setEditing(false);
  }

  if (verified) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200">
          <ShieldCheck className="w-3 h-3" /> Doğrulandı
        </span>
        {source && <span className="text-[11px] text-gray-500 italic">{source}</span>}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          disabled={busy}
          onClick={() => apply(false, source ?? "")}
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : "Geri al"}
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-500 border border-gray-200">
          <HelpCircle className="w-3 h-3" /> Teyit bekliyor
        </span>
        {source && <span className="text-[11px] text-gray-400 italic">{source}</span>}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={() => { setDraft(source ?? ""); setEditing(true); }}
        >
          Doğrula
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <Input
        autoFocus
        className="h-8 text-xs"
        placeholder="Kaynak zorunlu — ör. üretici katalogu 2024, tedarikçi teyidi, fiziksel ölçüm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px] bg-green-600 hover:bg-green-700"
          disabled={busy || !draft.trim()}
          onClick={() => apply(true, draft)}
        >
          {busy ? <Loader2 className="size-3 animate-spin mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
          Doğrulandı olarak işaretle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-[11px]"
          onClick={() => { setEditing(false); setError(""); }}
        >
          İptal
        </Button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
