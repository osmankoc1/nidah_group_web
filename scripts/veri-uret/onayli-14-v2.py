# -*- coding: utf-8 -*-
"""
Onaylanan 14 açıklamanın PROFESYONELLEŞTİRİLMİŞ sürümü (kullanıcı kararı
2026-11-27). Kurallar:
  · araştırma notu niteliğindeki ifadeler çıkarıldı
  · teknik katalog referansları KORUNDU
  · parça numarası ve doğrulanmış makine uyumluluğu KORUNDU
  · bilinmeyen ölçü/özellik UYDURULMADI
  · aynı adlı ürünler parça numarasıyla ayrıldı
  · gereksiz tekrar azaltıldı, anahtar kelime doldurma yapılmadı
Çıktı: scripts/veri/onayli-aciklamalar-14.json
"""
import json, io, os

M = [
 ("C0210-42010", "Daire döndürme somunu",
  "HMK 600MG greyderin daire döndürme grubunda kullanılan somundur. "
  "HİDROMEK kataloğunda G030.00.01 numaralı çizimin 19. kalemi olarak "
  "kayıtlıdır. Aynı çizimin 33. kalemindeki N2305-22000 somun ayrı bir "
  "parçadır; doğru parçayı seçmek için C0210-42010 numarasını kullanın."),

 ("N1455-22050", "Daire döndürme saplaması",
  "HMK 600MG greyderin daire döndürme grubunda kullanılan saplamadır. "
  "HİDROMEK kataloğunda G030.00.01 numaralı çizimin 31. kalemidir; onu "
  "izleyen kalemler 32. kalem N2515-22000 yaylı pul ve 33. kalem "
  "N2305-22000 somundur. Katalogda benzer adla geçen CH 24323 daire "
  "saplaması ayrı bir parçadır. Sipariş N1455-22050 numarasıyla verilir."),

 ("N2515-22000", "Yaylı pul",
  "HMK 600MG greyderin daire döndürme grubunda kullanılan yaylı puldur. "
  "HİDROMEK kataloğunda G030.00.01 numaralı çizimin 32. kalemi olarak "
  "kayıtlıdır; onu önceleyen 31. kalem N1455-22050 daire döndürme "
  "saplamasıdır. Katalogda aynı adla geçen F2515-14000 yaylı pul ayrı bir "
  "parçadır; sipariş N2515-22000 numarasıyla verilir."),

 ("N010232438", "M10×20 ISO 4017 cıvata",
  "ISO 4017 standardında M10×20 cıvata. HMK 600MG kataloğunda E090.01.01 "
  "numaralı çizimin 20. kalemi olarak kayıtlıdır. Katalogda farklı "
  "ölçülerde başka cıvatalar da bulunur; bu kayıt ISO 4017 standardı ve "
  "M10×20 ölçüsüyle tanımlanır. Sipariş N010232438 numarasıyla verilir."),

 ("N030810015", "M10 300HV pul",
  "HMK 600MG kataloğunda M10 300HV tanımıyla kayıtlı puldur; HİDROMEK "
  "çizim numarası G040.00.01, kalem 2'dir. Katalogdaki diğer pullardan "
  "M10 ölçüsü ve 300HV tanımıyla ayrılır. Doğru pulu seçmek için "
  "N030810015 numarasını ve çizim kalemini birlikte kullanın."),

 ("N1035-20150", "M20×150 cıvata",
  "M20×150 cıvata. HMK 600MG kataloğunda D030.00.01 numaralı çizimin 19. "
  "kalemi olarak kayıtlıdır; aynı çizimde 11. kalem 60482-00500 aşınma "
  "bandı, 14. kalem 61382-01000 3,2 mm ayar puludur. Katalogdaki diğer "
  "cıvatalardan M20×150 ölçüsüyle ayrılır. Sipariş N1035-20150 "
  "numarasıyla verilir."),

 ("69404-02600", "Şanzıman baskı plakası",
  "HMK 600MG şanzımanının baskı plakasıdır. HİDROMEK kataloğunda "
  "E160.00.02 numaralı çizimin 19. kalemi olarak kayıtlıdır; aynı çizimde "
  "10. kalem 60525-01700 birinci kademe şanzıman taşıyıcısı, 11. kalem "
  "60525-12300 şanzıman merkez milidir. Katalogda aynı adla geçen "
  "60325-01300 (E160.00.01, kalem 2) ve Mitsubishi MG430 için kayıtlı "
  "69241-00901 ayrı parçalardır; sipariş 69404-02600 numarasıyla verilir."),

 ("714-12-19320", "Şanzıman ara dişli yatağı",
  "Komatsu WA320-3MC yükleyicinin güç aktarma grubunda kullanılan "
  "şanzıman ara dişli yatağıdır. Üretici kataloğunda F4350-58A0 "
  "bölümünde, F-030 numaralı çizimin 2. kalemi olarak kayıtlıdır. "
  "Katalog kapsamı A31001 ve üzeri seri numaralarıdır. Sipariş "
  "714-12-19320 numarasıyla verilir."),

 ("714-12-19710", "Şanzıman debriyaj diski",
  "Komatsu WA320-3MC yükleyicinin şanzıman grubunda kullanılan debriyaj "
  "diskidir. Üretici kataloğunda üç çizimde kayıtlıdır: F4350-53A0 / "
  "F-020 kalem 4, F4350-54A0 / F-022 kalem 3 ve F4350-55A0 / F-024 kalem "
  "3. Aynı çizimlerde onu izleyen kalem 714-16-19730 şanzıman ayırıcı "
  "plakasıdır. Katalog kapsamı A31001 ve üzeri seri numaralarıdır; "
  "sipariş 714-12-19710 numarasıyla verilir."),

 ("714-16-19730", "Şanzıman ayırıcı plakası",
  "Komatsu WA320-3MC yükleyicinin şanzıman grubunda kullanılan ayırıcı "
  "plakadır. Üretici kataloğunda F4350-53A0 / F-020 kalem 5, F4350-54A0 / "
  "F-022 kalem 4 ve F4350-55A0 / F-024 kalem 4 olarak kayıtlıdır; aynı "
  "çizimlerde onu önceleyen kalem 714-12-19710 debriyaj diskidir. "
  "Numarası yalnızca orta grubuyla ayrılan 714-12-19730 park freni "
  "ayırıcı plakası ayrı bir parçadır; bu kayıt 714-16-19730 numarasını "
  "taşır. Katalog kapsamı A31001 ve üzeri seri numaralarıdır."),

 ("CH 12119-10", "Daire ayar pulu",
  "Volvo G900 serisi greyderlerin daire döndürme arka grubunda kullanılan "
  "ayar puludur. Üretici kataloğunda G0008437 çiziminin 1119. sayfasında "
  "7. kalem olarak kayıtlıdır. Kalınlık değeri katalogda yer almaz; aynı "
  "kalemdeki CH 12119-16 ve CH 12119-20 pullarından ayrımı parça "
  "numarasıyla yapılır; bu kayıt CH 12119-10 numarasını taşır. Doğrulanmış "
  "makineler: G930, G940, G946, G960, G970, G976."),

 ("CH 12119-16", "Daire ayar pulu",
  "Volvo G900 serisi greyderlerde daire döndürme arka grubunun ayar "
  "puludur. G0008437 numaralı üretici çiziminin 1119. sayfasında 7. kalem "
  "olarak kayıtlıdır; kalınlık değeri katalogda belirtilmez. Aynı "
  "kalemdeki CH 12119-10 ve CH 12119-20 ile karışmaması için sipariş "
  "CH 12119-16 numarasıyla verilir. Doğrulanmış makineler: G930, G940, "
  "G946, G960, G970, G976."),

 ("CH 12119-20", "Daire ayar pulu",
  "Volvo G900 serisi greyderlerin daire döndürme arka grubuna ait ayar "
  "puludur; üretici kataloğunda G0008437 çiziminin 1119. sayfasında 7. "
  "kalemde yer alır. Aynı kalemdeki CH 12119-10 ve CH 12119-16 pullarının "
  "kalınlık değerleri de katalogda kayıtlı değildir. Çizimin 6. "
  "kalemindeki VOE 12749768 ayrı bir daire ayar puludur. Sipariş "
  "CH 12119-20 numarasıyla verilir. Doğrulanmış makineler: G930, G940, "
  "G946, G960, G970, G976."),

 ("VOE 12727387", "Bıçak kaydırma elemanı",
  "Volvo G930 greyderin bıçak montaj grubunda kullanılan kaydırma "
  "elemanıdır. Üretici kataloğunda 20061 numaralı çizimin 2. kalemi "
  "olarak kayıtlıdır; aynı çizimde 3. kalem VOE 12727728 bıçak kaydırma "
  "yatağı, 4. kalem VOE 15403165 bıçak kaydırma uç plakasıdır. Sipariş "
  "VOE 12727387 numarasıyla verilir."),
]

assert len(M) == 14
assert len({p for p, _, _ in M}) == 14

# ── Kalite sağlamaları ────────────────────────────────────────────────────
YASAK = [
    "İncelenen katalog kayıtlarında",
    "tahmin yazılmadı",
    "belirtilmemiştir",
    "doğrulanamadı",
    "kayıtta geçmiyor",
    "ayrım parça numarasından ve çizim kaleminden yapılır",
]
for pn, ad, t in M:
    for y in YASAK:
        assert y not in t, "arastirma notu kalmis: %s -> %s" % (pn, y)
    assert pn in t, "parca numarasi metinde yok: %s" % pn
    assert len(t) >= 200, "cok kisa: %s (%d)" % (pn, len(t))
    assert len(t) <= 500, "cok uzun: %s (%d)" % (pn, len(t))

# Şablon denetimi: iki metin arasındaki en yüksek benzerlik
from difflib import SequenceMatcher
enYuksek = 0.0
cift = None
for i in range(len(M)):
    for j in range(i + 1, len(M)):
        o = SequenceMatcher(None, M[i][2], M[j][2]).ratio()
        if o > enYuksek:
            enYuksek, cift = o, (M[i][0], M[j][0])
print("en yuksek benzerlik: %.0f%%  %s" % (enYuksek * 100, cift))

kayit = [
    {"partNumber": pn, "ad": ad, "beklenenKarakter": len(t), "longDescription": t}
    for pn, ad, t in M
]
os.makedirs("scripts/veri", exist_ok=True)
with io.open("scripts/veri/onayli-aciklamalar-14.json", "w", encoding="utf-8") as f:
    json.dump(kayit, f, ensure_ascii=False, indent=1)
print("yazildi: scripts/veri/onayli-aciklamalar-14.json")
for k in kayit:
    print("  %-14s %4d kr  %s" % (k["partNumber"], k["beklenenKarakter"], k["ad"]))
