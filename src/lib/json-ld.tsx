import type { ReactElement } from "react";

/**
 * JSON-LD'yi XSS'e karşı güvenli biçimde serialize eder.
 *
 * `JSON.stringify` çıktısı `</script>` dizisini olduğu gibi bırakır; bu dizi
 * bir string alanının içinde geçerse (ör. DB'den gelen ürün adı, blog başlığı)
 * tarayıcı <script> bloğunu erkenden kapatır ve kalan içerik HTML olarak
 * yorumlanır. `<` karakterini `\u003c` olarak kaçırmak bunu tamamen engeller;
 * JSON tarafında değer aynı kaldığı için structured data semantiği DEĞİŞMEZ.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Tek bir JSON-LD <script> etiketi render eder.
 * Tüm sayfalar bunu kullanır — escape mantığı tek yerde durur.
 */
export function JsonLd({ data }: { data: unknown }): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
