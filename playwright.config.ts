import { defineConfig } from "@playwright/test";

/**
 * Birim / regresyon testleri.
 *
 * NEDEN PLAYWRIGHT: `@playwright/test` zaten `devDependencies` içinde duruyordu
 * ama config'i, test dosyası ve `test` script'i yoktu (proje CLAUDE.md §1).
 * Koşucu olarak bunu kullanmak YENİ BAĞIMLILIK GEREKTİRMEZ ve TypeScript ile
 * tsconfig `paths` (`@/*`) çözümlemesini hazır verir.
 *
 * TARAYICI GEREKMEZ: buradaki testlerin hiçbiri `page` fixture'ını kullanmaz,
 * bu yüzden Playwright hiçbir tarayıcı binary'si indirmez/başlatmaz.
 * `projects` tanımlanmaz — tek, tarayıcısız varsayılan proje çalışır.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  // Saf fonksiyon testleri; uzun süren bir iş yok.
  timeout: 10_000,
});
