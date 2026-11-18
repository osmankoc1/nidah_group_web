/**
 * Admin oturumundaki kullanıcı adının OKUNMASI — işlem kaydı için.
 *
 * NE DEĞİL: bu modül YETKİLENDİRME YAPMAZ ve `src/proxy.ts`'in yerine
 * GEÇMEZ. Bir `/api/admin/**` isteği bu fonksiyona ulaştığında proxy zaten
 * JWT'yi doğrulamış, aksi halde 401 dönmüştür. Burada token yeniden
 * doğrulanır çünkü proxy kullanıcı adını route'a FORWARD ETMİYOR; amaç
 * erişim kararı vermek değil, "bu işlemi kim yaptı" bilgisini yazmaktır.
 *
 * Bu yüzden hata durumunda `null` döner ve ÇAĞIRAN İŞLEMİ ENGELLEMEZ:
 * kimlik yazılamadığı için bir doğrulama işlemi başarısız olmamalı.
 * (Kullanıcı şartı K7: "Yetkilendirme, giriş doğrulama ve işlem kayıtlarını
 * koru." — yetkilendirme proxy'de kalır, işlem kaydı burada eklenir.)
 *
 * GİZLİLİK: yalnızca kullanıcı ADI döner. Token, parola, e-posta veya
 * oturum kimliği hiçbir yere yazılmaz, loglanmaz.
 */
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

/** `product_images.verified_by` kolonunun uzunluğu (drizzle/0011). */
const MAX_UZUNLUK = 200;

export async function adminUsername(): Promise<string | null> {
  try {
    const token = (await cookies()).get("admin-token")?.value;
    if (!token) return null;

    const secretValue = process.env.JWT_SECRET;
    if (!secretValue) return null;

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secretValue)
    );

    const username = payload.username;
    if (typeof username !== "string") return null;

    const trimmed = username.trim();
    return trimmed ? trimmed.slice(0, MAX_UZUNLUK) : null;
  } catch {
    // Süresi geçmiş / bozuk token: proxy bu isteği buraya hiç bırakmazdı.
    // Yine de kimlik yazılamadı diye işlemi düşürmüyoruz.
    return null;
  }
}
