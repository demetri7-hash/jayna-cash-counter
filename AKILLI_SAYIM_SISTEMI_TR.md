# AKILLI SAYIM VE HAZIRLIK SİSTEMİ

**Oluşturulma Tarihi:** 11 Ekim 2025
**Sistem Versiyonu:** v6.1+
**Dil:** Türkçe

---

## 📋 İÇİNDEKİLER

1. [Sistem Genel Bakış](#sistem-genel-bakış)
2. [Nasıl Çalışır?](#nasıl-çalışır)
3. [Akıllı Öğrenme Sistemi](#akıllı-öğrenme-sistemi)
4. [Günlük Sayım Oturumları](#günlük-sayım-oturumları)
5. [Tüketim Takibi](#tüketim-takibi)
6. [Sipariş Önerileri Mantığı](#sipariş-önerileri-mantığı)
7. [Fatura OCR Öğrenme Sistemi](#fatura-ocr-öğrenme-sistemi)
8. [Öncelik Seviyeleri](#öncelik-seviyeleri)

---

## SISTEM GENEL BAKIŞ

Jayna Organic Eatery'nin akıllı sayım sistemi, restoranın hazırlık (prep) envanterini yönetmek ve optimize etmek için geliştirilmiş yapay zeka destekli bir platformdur.

### Temel Özellikler:

✅ **Otomatik Öğrenme:** Sistem zamanla alışkanlıklarınızı öğrenir
✅ **Tüketim Analizi:** Günlük kullanım miktarlarını takip eder
✅ **Akıllı Öneriler:** Ne kadar hazırlık yapmanız gerektiğini söyler
✅ **Fatura Okuma:** Fatura fotoğraflarını otomatik olarak analiz eder
✅ **Zaman Takibi:** Her ürünün en son ne zaman sayıldığını bilir

---

## NASIL ÇALIŞIR?

### 1. Envanter Yönetimi

Sistem 38 adet hazırlık ürününü takip eder:

**Örnek Ürünler:**
- Salata Karışımı
- Baba Ganoush
- Spanakopita
- Humus
- Tzatziki
- Dubai Çikolata
- ...ve daha fazlası

Her ürün için şunlar kaydedilir:
- **Mevcut Stok:** Şu anda ne kadar var?
- **Par Seviyesi:** Kaç tane olması gerekiyor?
- **Birim:** CAMBRO, Container, Portion, vb.
- **Son Sayım:** En son ne zaman sayıldı?
- **Hazırlık Süresi:** Hazırlamak kaç dakika sürer?
- **Raf Ömrü:** Kaç saat taze kalır?

### 2. Gerçek Zamanlı Güncelleme

Sisteme yeni sayım girdiğinizde:
1. ✅ Mevcut stok güncellenir
2. ✅ Sayım zamanı kaydedilir
3. ✅ Bir önceki sayımla karşılaştırılır
4. ✅ Tüketim miktarı hesaplanır
5. ✅ Öneri listesi yeniden oluşturulur

---

## AKILLI ÖĞRENME SİSTEMİ

### 1. Tüketim Öğrenme

Sistem **son 7 günlük** verilerinizi analiz eder:

```
Örnek: Humus Tüketimi
─────────────────────────
Pazartesi:  Sabah 2 → Öğle 1    (-1 kullanım)
Salı:       Sabah 2 → Öğle 0.5  (-1.5 kullanım)
Çarşamba:   Sabah 2 → Öğle 1    (-1 kullanım)
...

Ortalama Tüketim: ~1.2 CAMBRO/oturum
```

Bu veri ile sistem **gelecekteki ihtiyaçları tahmin eder**.

### 2. Fatura Eşleştirme Öğrenme

Fatura yüklediğinizde OCR sistemi ürün isimlerini okur:

**İlk Sefer:**
```
Fatura Yazısı: "Organic Arugula 4# Case"
Sistem: %68 benzerlik → SALAD MIX ile eşleştirildi
Siz: Elle ARUGULA olarak düzelttiniz
```

**İkinci Sefer:**
```
Fatura Yazısı: "Organic Arugula 4# Case"
Sistem: ✅ Önceki eşleşmeyi hatırladı → ARUGULA
Benzerlik: %100 (öğrenilmiş)
```

Sistem **her düzeltmenizi hatırlar** ve bir dahaki sefere otomatik olarak doğru eşleştirir!

### 3. Alias (Takma Ad) Sistemi

Sistem, farklı fatura formatlarını aynı ürüne bağlar:

```
Ürün: TZATZIKI
─────────────────────────
Öğrenilen Alternatifler:
- "Tzatziki Sauce"
- "Greek Yogurt Dip"
- "Cacik"
- "Cucumber Yogurt Sauce"

Hepsi → TZATZIKI olarak tanınır
```

Bu sayede **hangi tedarikçiden alırsanız alın**, sistem ürünü tanır!

---

## GÜNLÜK SAYIM OTURUMLARI

Sistem günde **3 kritik sayım noktası** önerir:

### 1. 🌅 SABAH HAZIRLIK (Morning Prep)
**Zaman:** 08:00 - 10:00
**Amaç:** Gece tüketimini ölç, gün için hazırla

```
Ne Yapar:
✓ Gece boyunca ne tüketildi?
✓ Bugün için ne hazırlanmalı?
✓ Öğle servisi için yeterli mi?
```

### 2. ☀️ ÖĞLEDEN SONRA HAZIRLIK (Afternoon Prep)
**Zaman:** 14:00 - 16:00
**Amaç:** Öğle tüketimini ölç, akşam için hazırla

```
Ne Yapar:
✓ Öğle servisi ne kadar tüketti?
✓ Akşam servisi için ne gerekli?
✓ Hangi ürünler hızlı tükeniyor?
```

### 3. 🌙 KAPANIŞ SAYIMI (Closing Line)
**Zaman:** 22:00 - 23:00
**Amaç:** Günlük tüketimi ölç, sabah için plan yap

```
Ne Yapar:
✓ Bugün toplam ne kullanıldı?
✓ Yarın sabah için ne kalıyor?
✓ Sabah ilk iş ne hazırlanmalı?
```

---

## TÜKETİM TAKİBİ

### Nasıl Hesaplanır?

```javascript
Tüketim = Başlangıç Sayısı - Bitiş Sayısı

Örnek:
─────────────────────────────────────
Sabah Sayımı:    2.0 CAMBRO Humus
Öğle Sayımı:     0.5 CAMBRO Humus
─────────────────────────────────────
Tüketim:         1.5 CAMBRO
Süre:            Sabah → Öğle (6 saat)
Oran:            0.25 CAMBRO/saat
```

### 7 Günlük Ortalama

Sistem son 7 günü analiz eder:

```
Humus Tüketim Geçmişi:
─────────────────────────────────────
Pazartesi:   1.2 CAMBRO
Salı:        1.5 CAMBRO
Çarşamba:    1.0 CAMBRO
Perşembe:    1.8 CAMBRO (yoğun gün)
Cuma:        2.0 CAMBRO (en yoğun)
Cumartesi:   1.7 CAMBRO
Pazar:       0.8 CAMBRO (sakin)
─────────────────────────────────────
Ortalama:    1.43 CAMBRO/gün
```

Bu veri ile **akıllı tahminler** yapılır!

---

## SİPARİŞ ÖNERİLERİ MANTIĞI

### Öneri Hesaplama Formülü

```javascript
if (Mevcut Stok === 0) {
  // ACIL: Stok bitti!
  Öneri = Math.max(Par Seviyesi, Ortalama Tüketim × 2)
  Öncelik = "URGENT"
}
else if (Stok Yüzdesi < 50%) {
  // YÜKSEK: Stok düşük!
  Öneri = Par Seviyesi - Mevcut Stok
  Öncelik = "HIGH PRIORITY"
}
else if (Stok Yüzdesi < 75% && Ortalama Tüketim > 0) {
  // ORTA: Stok azalıyor
  Öneri = Ortalama Tüketim × 1.5
  Öncelik = "MEDIUM PRIORITY"
}
else {
  // DÜŞÜK: Stok iyi
  Öneri = Yok
  Öncelik = "LOW PRIORITY"
}
```

### Gerçek Hayat Örneği

```
Ürün: SPANAKOPITA
─────────────────────────────────────
Par Seviyesi:        20 PIECE
Mevcut Stok:         2 PIECE
Stok Yüzdesi:        10% (2/20)
Ortalama Tüketim:    8 PIECE/gün
─────────────────────────────────────
HESAPLAMA:
10% < 50% → HIGH PRIORITY
Öneri = 20 - 2 = 18 PIECE

AÇIKLAMA:
"Stok %50'nin altında (%10)"
"En az 18 adet hazırla"
```

---

## FATURA OCR ÖĞRENME SİSTEMİ

### 1. Fatura Yükleme

Sisteme fatura fotoğrafı yüklersiniz:

```
Desteklenen Formatlar:
✓ JPEG/JPG
✓ PNG
✓ Kamera ile çekilen fotoğraflar
✓ Yüklenen dosyalar
```

### 2. OCR Okuma (Tesseract.js v4)

Sistem faturayı otomatik okur:

```
Okunan Satırlar:
─────────────────────────────────────
2 Arugula 4# CS              12.50
1.5 Fresh Basil Bunch        8.99
3 Organic Tomatoes LB        15.75
1 Greek Yogurt 5lb           24.50
─────────────────────────────────────
```

### 3. Fuzzy Matching (Bulanık Eşleştirme)

Okunan her satır için envanter taranır:

```
Okunan: "Organic Tomatoes LB"
─────────────────────────────────────
Karşılaştırma:
✗ SALAD MIX          → Benzerlik: %12
✗ BABA GANOUSH       → Benzerlik: %8
✓ TOMATO WEDGED      → Benzerlik: %65
✓ TOMATO DICED       → Benzerlik: %68
─────────────────────────────────────
En İyi Eşleşme: TOMATO DICED (%68)
```

### 4. Manuel Düzeltme

Eğer sistem yanlış eşleştirdiyse düzeltirsiniz:

```
Sistem Önerisi: TOMATO DICED (%68)
Sizin Seçiminiz: TOMATO WEDGED

→ Sistem bunu KALICI OLARAK ÖĞRENIR!
```

### 5. Gelecek Kullanım

Bir dahaki sefere aynı fatura metni gelirse:

```
Okunan: "Organic Tomatoes LB"

Sistem Hafızası:
✓ Daha önce "TOMATO WEDGED" ile eşleştirilmişti
✓ Benzerlik: %100 (öğrenilmiş)
✓ Otomatik eşleştirme: TOMATO WEDGED

→ Manuel seçim gerekmez!
```

### Öğrenme Veritabanı

Sistem `invoice_item_aliases` tablosunda saklar:

```sql
Örnek Kayıt:
─────────────────────────────────────
detected_name:     "organic tomatoes lb"
inventory_item_id: 42 (TOMATO WEDGED)
confidence:        1.0
created_by:        "Manager"
created_at:        "2025-10-11 14:32:00"
```

Her düzeltme **kalıcı öğrenme** sağlar!

---

## ÖNCELİK SEVİYELERİ

### 🔴 URGENT - Acil (Stok Bitti)

```
Durum:
✗ Mevcut Stok = 0
✗ Hemen hazırlanmalı!

Öneri Mantığı:
→ En az Par Seviyesi kadar hazırla
→ Veya Ortalama Tüketim × 2 (hangisi büyükse)

Görsel:
→ Siyah başlık (#212121)
→ Kırmızı "OUT" yazısı
→ Detaylı tablo görünümü
```

### 🟡 HIGH PRIORITY - Yüksek Öncelik (Stok Düşük)

```
Durum:
! Stok %50'nin altında
! Bugün veya yarın bitmek üzere

Öneri Mantığı:
→ Par Seviyesine tamamla
→ Öneri = Par - Mevcut Stok

Görsel:
→ Koyu gri başlık (#424242)
→ Detaylı tablo görünümü
```

### 🟢 LOW PRIORITY - Düşük Öncelik (Stok İyi)

```
Durum:
✓ Stok %75'in üzerinde
✓ Şimdilik hazırlamaya gerek yok

Öneri Mantığı:
→ Öneri yok
→ Sadece takip amaçlı

Görsel:
→ Kompakt liste görünümü
→ Sadece "Ürün Adı (75%)" formatı
→ 3 sütun düzeni (yer tasarrufu)
```

---

## ZAMAN FORMATI

Sistem **hassas zaman takibi** yapar:

```
< 1 saat:
→ "32m ago" (dakika bazlı)

1-24 saat:
→ "1hr and 32m ago" (saat + dakika)
→ "4hr and 15m ago"
→ "6hr ago" (tam saat)

1-7 gün:
→ "3d ago" (gün bazlı)

7+ gün:
→ "10/09/25" (tarih formatı)
```

Bu sayede **tam olarak ne zaman** sayıldığını bilirsiniz!

---

## YAZDIRMA VE PDF

### Ekran Görünümü = PDF Görünümü

Sistem **tüm cihazlarda aynı görünümü** sağlar:

**Renk Şeması:**
- ⚫ Gri tonları (profesyonel)
- 🔵 Mavi vurgu (Jayna logosu rengi)
- 🔴 Kırmızı sadece OUT ürünler için
- ⚪ Keskin köşeler (modern tasarım)

**Kompakt Düzen:**
- 1-2 sayfa (eskiden 3+ sayfa)
- Küçük fontlar (7-16pt arası)
- Yer tasarrufu (%70 azaltma)
- Mobil uyumlu

---

## GÜÇLÜ YÖNLER

### 1. Otomatik Öğrenme
✅ Her gün daha akıllı olur
✅ Alışkanlıklarınızı tanır
✅ Tahminler zamanla daha doğru

### 2. Zaman Tasarrufu
✅ Fatura okuma otomatik
✅ Öneriler hazır
✅ Manuel hesaplama yok

### 3. İsraf Önleme
✅ Ne kadar gerektiğini tam bilir
✅ Fazla hazırlık yapmaz
✅ Eksik kalma riski düşer

### 4. Kolay Kullanım
✅ Fotoğraf çek, sistem okusun
✅ Bir tıkla güncelle
✅ Anında rapor al

### 5. Mobil Uyumlu
✅ Telefondan kullan
✅ Mutfakta tablet ile çalış
✅ Her cihazdan erişim

---

## NASIL KULLANILIR?

### Günlük Akış:

**SABAH (08:00):**
```
1. "PREP" sekmesine git
2. "Count Session: Morning Prep" seç
3. Her ürünü say ve güncelle
4. "REFRESH PREP SHEET" tıkla
5. URGENT ve HIGH PRIORITY'yi hazırla
```

**ÖĞLE (14:00):**
```
1. "Count Session: Afternoon Prep" seç
2. Tekrar say ve güncelle
3. Tüketim otomatik hesaplanır
4. Akşam için önerileri kontrol et
```

**AKŞAM (22:00):**
```
1. "Count Session: Closing Line" seç
2. Son sayımı yap
3. Yarın sabah için önerileri gör
4. PDF veya PRINT ile çıktı al
```

---

## TEKNİK DETAYLAR

### Veritabanı Yapısı:

**inventory_items** (Envanter)
```sql
- id (unique)
- item_name (ürün adı)
- vendor (tedarikçi)
- unit (birim)
- current_stock (mevcut stok)
- par_level (par seviyesi)
- item_type ('prep' veya 'ingredient')
- prep_time_minutes (hazırlık süresi)
- batch_lifespan_hours (raf ömrü)
- last_counted_date (son sayım tarihi)
```

**prep_consumption_log** (Tüketim Geçmişi)
```sql
- item_id (ürün referansı)
- count_date (tarih)
- from_session (nereden)
- to_session (nereye)
- starting_count (başlangıç)
- ending_count (bitiş)
- consumption_amount (tüketim)
```

**invoice_item_aliases** (Öğrenilmiş Eşleşmeler)
```sql
- detected_name (faturadaki isim)
- inventory_item_id (envanter ürünü)
- confidence (güven skoru)
- created_by (kim oluşturdu)
```

---

## SONUÇ

Bu sistem **sürekli öğrenen, akıllandıkça gelişen** bir envanter yönetim platformudur.

### Ana Avantajlar:

1. ✅ **Otomatik:** Minimum manuel işlem
2. ✅ **Akıllı:** Zamanla daha iyi tahminler
3. ✅ **Verimli:** İsraf ve eksiklik önleme
4. ✅ **Kolay:** Basit arayüz, hızlı kullanım
5. ✅ **Güvenilir:** Her sayım kaydedilir

### Gelecek Geliştirmeler:

- 📊 Grafiklerle tüketim analizi
- 🤖 Daha gelişmiş AI tahminleri
- 📱 Mobil uygulama
- 🔔 Otomatik uyarılar
- 📧 Email raporları

---

**Oluşturan:** Claude Code
**Versiyon:** 6.1+
**Tarih:** 11 Ekim 2025
**Restoran:** Jayna Organic Eatery
**Konum:** Sacramento, CA

---

## İLETİŞİM

Sorularınız için:
- Sistem yöneticisine başvurun
- Manager Dashboard'dan raporları inceleyin
- PROCESS_LOG.md dosyasını kontrol edin

**Başarılı hazırlıklar! 🎯**
