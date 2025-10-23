-- ============================================
-- BOH CHECKLISTS INSERTION - COMPLETE
-- ============================================
-- Created: October 22, 2025
-- Purpose: Insert 3 COMPLETE BOH checklists with ALL tasks/categories in 3 languages
-- Checklists:
--   1. AM CLEANING CHECKLIST (checkbox tasks)
--   2. CLOSER RATING (DUE 10AM) - 11 rating categories
--   3. OPENING/TRANSITION RATING (DUE 5PM) - 9 rating categories
--
-- Run this in Supabase SQL Editor AFTER foh_checklists_schema.sql
-- This will DELETE and RECREATE all BOH checklists to ensure 100% accuracy

-- ============================================
-- CLEAN UP: Delete existing BOH checklists
-- ============================================
DELETE FROM checklist_definitions WHERE type LIKE 'boh_%';

-- ============================================
-- 1. AM CLEANING CHECKLIST
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes)
VALUES (
  'boh_am_cleaning',
  'AM CLEANING CHECKLIST',
  'AM Opening',
  'Cleaning and opening duties for BOH - includes floors, bathrooms, and outdoor areas',
  1,
  false,
  true
);

-- Get the checklist ID for AM CLEANING
DO $$
DECLARE
  am_cleaning_id UUID;
  floors_section_id UUID;
  bathrooms_section_id UUID;
BEGIN
  SELECT id INTO am_cleaning_id FROM checklist_definitions WHERE type = 'boh_am_cleaning';

  -- ============================================
  -- SECTION 1: FLOORS
  -- ============================================
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'FLOORS', 'checkbox', 1)
  RETURNING id INTO floors_section_id;

  -- FLOORS TASKS (in order of checklist)
  INSERT INTO checklist_section_tasks (section_id, task_text_en, task_text_es, task_text_tr, display_order) VALUES
  (floors_section_id,
   'Sweep all floors (behind bar/expo, main dining, small dining, office, bathrooms)',
   'Barrer todos los pisos (detrás de la barra/expo, salón principal, salón pequeño, oficina, baños)',
   'Tüm zeminleri süpürün (bar tezgahı/servis arkası, ana yemek salonu, küçük yemek salonu, ofis, tuvaletler)',
   1),

  (floors_section_id,
   'Mop all floors with fresh mop, hot water and floor cleaner or bleach',
   'Trapear todos los pisos con un trapo limpio, agua caliente y limpiador de pisos o cloro',
   'Tüm zeminleri temiz bir paspas, sıcak su ve yer temizleyici veya çamaşır suyu ile silin',
   2),

  (floors_section_id,
   'Mopping order: 1st Main Dining, 2nd Small Dining, 3rd Bar/Expo, 4th Office, Last Bathrooms',
   'Orden de trapeo: 1ro Salón principal, 2do Salón pequeño, 3ro Barra/Expo, 4to Oficina, Último Baños',
   'Paspas sırası: 1. Ana Yemek Salonu, 2. Küçük Yemek Salonu, 3. Bar/Servis, 4. Ofis, En Son Tuvaletler',
   3),

  (floors_section_id,
   'Dump dirty water in planter area outside',
   'Vaciar el agua sucia en el área de macetas afuera',
   'Kirli suyu dışarıdaki saksı bölgesine dökün',
   4),

  (floors_section_id,
   'Store yellow mop bucket with mop behind backdoor, hidden as much as possible',
   'Guardar el cubo amarillo con el trapo detrás de la puerta trasera, escondido lo más posible',
   'Sarı paspas kovasını ve paspası arka kapının arkasında, mümkün olduğunca gizli şekilde saklayın',
   5),

  (floors_section_id,
   'Take down all chairs',
   'Bajar todas las sillas',
   'Tüm sandalyeleri indirin',
   6),

  (floors_section_id,
   'Use the blower to clean entire parking lot',
   'Usar el soplador para limpiar todo el estacionamiento',
   'Tüm otoparkı temizlemek için üfleyiciyi kullanın',
   7),

  (floors_section_id,
   'Check all planters around property for trash and remove as needed',
   'Revisar todas las macetas alrededor de la propiedad para basura y retirarla si es necesario',
   'Mülk etrafındaki tüm saksıları çöpler için kontrol edin ve gerektiğinde temizleyin',
   8),

  (floors_section_id,
   'Check for cobwebs in front of building and around planter boxes in side patio area, use broom to remove',
   'Revisar telarañas en el frente del edificio y alrededor de las macetas en el área del patio lateral; usar una escoba para quitarlas',
   'Binanın önünde ve yan bahçe oturma alanındaki saksı kutularının dışındaki örümcek ağlarını kontrol edin, temizlemek için süpürge kullanın',
   9);

  -- ============================================
  -- SECTION 2: BATHROOMS
  -- ============================================
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'BATHROOMS', 'checkbox', 2)
  RETURNING id INTO bathrooms_section_id;

  -- BATHROOMS TASKS (in order of checklist)
  INSERT INTO checklist_section_tasks (section_id, task_text_en, task_text_es, task_text_tr, display_order) VALUES
  (bathrooms_section_id,
   'After sweeping and mopping, use toilet cleaner and brush to scrub the toilet',
   'Después de barrer y trapear, use limpiador de baño y cepillo para tallar el inodoro',
   'Süpürme ve paspaslamadan sonra, klozeti temizlemek için klozet temizleyicisi ve fırçası kullanın',
   1),

  (bathrooms_section_id,
   'With gloves, use Purple HD Degreaser to clean entire toilet from top to bottom, wiping all porcelain',
   'Con guantes, use desengrasante morado HD para limpiar el inodoro de arriba a abajo, limpiando toda la porcelana',
   'Eldiven takarak, Mor HD Yağ Çözücüyü kullanıp klozetin tüm seramiğini yukarıdan aşağıya silin',
   2),

  (bathrooms_section_id,
   'Spray and wipe the floor around the whole toilet, including the back',
   'Rociar y limpiar el piso alrededor de todo el inodoro, incluyendo la parte trasera',
   'Klozetin etrafındaki zemini, arkası da dahil olmak üzere püskürtün ve silin',
   3),

  (bathrooms_section_id,
   'Make sure to wipe the toilet brush holder as well as the handle',
   'Asegúrese de limpiar el soporte del cepillo del inodoro así como el mango',
   'Klozet fırçası tutacağını ve sapını da sildiğinizden emin olun',
   4),

  (bathrooms_section_id,
   'Use Windex to wipe down mirrors with white/green stripe microfiber towel to avoid lint',
   'Use Windex para limpiar los espejos con una toalla de microfibra de rayas blancas/verdes para evitar pelusas',
   'Aynaları tüy bırakmamak için beyaz/yeşil çizgili mikrofiber havlu ile Windex kullanarak silin',
   5),

  (bathrooms_section_id,
   'Wipe down hand dryer machine',
   'Limpie la máquina secamanos',
   'El kurutma makinesini silin',
   6),

  (bathrooms_section_id,
   'Wipe down soap dispenser',
   'Limpie el dispensador de jabón',
   'Sabunluk cihazını silin',
   7),

  (bathrooms_section_id,
   'Wipe sink and rinse out',
   'Limpie el lavamanos y enjuáguelo',
   'Lavaboyu silin ve durulayın',
   8);

  RAISE NOTICE '✅ AM CLEANING CHECKLIST structure created with all tasks!';
END $$;

-- ============================================
-- 2. CLOSER RATING (DUE 10AM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_closer_rating',
  'CLOSER RATING',
  'DUE AT 10AM',
  'AM/Opening Line Cooks rate how the CLOSING crew left the restaurant (1-5 scale)',
  1,
  true,
  true,
  '1-5 Scale'
);

-- Populate CLOSER RATING categories
DO $$
DECLARE
  closer_rating_id UUID;
BEGIN
  SELECT id INTO closer_rating_id FROM checklist_definitions WHERE type = 'boh_closer_rating';

  INSERT INTO checklist_section_categories (checklist_id, category_name_en, category_name_es, category_name_tr, description_en, description_es, description_tr, display_order) VALUES

  (closer_rating_id,
   'STATIONS STOCKED (Appetizer/Salad/Meat/Fry/Grill)',
   'ESTACIONES SURTIDAS (Aperitivos/Ensalada/Carne/Frituras/Parrilla)',
   'İSTASYONLAR STOKLANMIŞ (Aperatif/Salata/Et/Fritür/Izgara)',
   'All pars met, backups wrapped, no empty pans',
   'Todos los pares cumplidos; respaldos envueltos; no hay bandejas vacías',
   'Tüm eşit seviyeler karşılandı; yedekler sarıldı; boş tava yok',
   1),

  (closer_rating_id,
   'CONTAINERS CHANGED & CLEAN',
   'CONTENEDORES CAMBIADOS Y LIMPIOS',
   'KONTEYNERLER DEĞİŞTİRİLMİŞ VE TEMİZ',
   'Fresh, correct-size pans; no crusted edges; lids clean',
   'Bandejas frescas del tamaño correcto; sin bordes incrustados; tapas limpias',
   'Taze, doğru boyutta tavalar; kabuklu kenarlar yok; kapaklar temiz',
   2),

  (closer_rating_id,
   'FIFO, DATING & LABELING',
   'FIFO, FECHADO Y ETIQUETADO',
   'FIFO, TARİHLEME VE ETİKETLEME',
   'All items labeled/dated; oldest on top/front',
   'Todos los artículos etiquetados/fechados; los más antiguos arriba/adelante',
   'Tüm ürünler etiketlendi/tarihlendi; en eskiler üstte/önde',
   3),

  (closer_rating_id,
   'GYRO COOKER',
   'COCEDOR DE GYROS',
   'GYROS PİŞİRİCİSİ',
   'Trays emptied/washed; shields clean; machine off safely',
   'Bandejas vaciadas/lavadas; escudos limpios; máquina apagada de forma segura',
   'Tepsiler boşaltıldı/yıkandı; kalkanlar temiz; makine güvenli şekilde kapatıldı',
   4),

  (closer_rating_id,
   'BLANCHED POTATOES FOR AM',
   'PAPAS BLANQUEADAS PARA AM',
   'AM İÇİN HAŞLANMIŞ PATATESLER',
   'Required containers present, labeled, chilled',
   'Contenedores requeridos presentes, etiquetados, refrigerados',
   'Gerekli konteynerler mevcut, etiketlendi, soğutuldu',
   5),

  (closer_rating_id,
   'FRYER OIL CONDITION',
   'CONDICIÓN DEL ACEITE DE FREIDORA',
   'FRİTÖZ YAĞI DURUMU',
   'Oil skimmed/filtered; change schedule followed',
   'Aceite filtrado/colado; programa de cambio seguido',
   'Yağ süzüldü/filtrelendi; değişim programı takip edildi',
   6),

  (closer_rating_id,
   'SURFACES & TOOLS',
   'SUPERFICIES Y HERRAMIENTAS',
   'YÜZEYLER VE ALETLER',
   'Stations wiped/sanitized; tools clean and staged',
   'Estaciones limpiadas/sanitizadas; herramientas limpias y organizadas',
   'İstasyonlar silindi/temizlendi; aletler temiz ve hazırlandı',
   7),

  (closer_rating_id,
   'FLOORS & MATS',
   'PISOS Y TAPETES',
   'ZEMİNLER VE PASPASLAR',
   'Swept & mopped; mats washed/placed; no debris',
   'Barridos y trapeados; tapetes lavados/colocados; sin escombros',
   'Süpürüldü ve paspaslandı; paspaslar yıkandı/yerleştirildi; moloz yok',
   8),

  (closer_rating_id,
   'STAINLESS, HOOD & WALLS',
   'ACERO INOXIDABLE, CAMPANA Y PAREDES',
   'PASLANMAZ ÇELİK, DAVLUMBAZ VE DUVARLAR',
   'Fronts smudge-free; hood/walls cleaned per schedule',
   'Frentes sin manchas; campana/paredes limpiadas según el programa',
   'Önler lekesiz; davlumbaz/duvarlar programa göre temizlendi',
   9),

  (closer_rating_id,
   'TO-GO, BOWLS & TRAYS STOCKED',
   'PARA LLEVAR, TAZONES Y BANDEJAS SURTIDAS',
   'PAKET, KASELER VE TEPSILER STOKLANDI',
   'Ample supply at open; no scrambling first hour',
   'Suministro amplio al abrir; sin prisas la primera hora',
   'Açılışta bol tedarik; ilk saat telaş yok',
   10),

  (closer_rating_id,
   'TRASH & DRAINS',
   'BASURA Y DRENAJES',
   'ÇÖP VE DRENAJAR',
   'Handwash trash emptied; drains bleached; no odors',
   'Basura de lavamanos vaciada; drenajes blanqueados; sin olores',
   'El yıkama çöpü boşaltıldı; giderler beyazlatıldı; koku yok',
   11);

  RAISE NOTICE '✅ CLOSER RATING categories created (11 total)!';
END $$;

-- ============================================
-- 3. OPENING/TRANSITION RATING (DUE 5PM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_opening_rating',
  'OPENING/TRANSITION RATING',
  'DUE AT 5PM',
  'PM/Closers rate how the OPENING/TRANSITION crew left the restaurant (1-5 scale)',
  1,
  true,
  true,
  '1-5 Scale'
);

-- Populate OPENING/TRANSITION RATING categories
DO $$
DECLARE
  opening_rating_id UUID;
BEGIN
  SELECT id INTO opening_rating_id FROM checklist_definitions WHERE type = 'boh_opening_rating';

  INSERT INTO checklist_section_categories (checklist_id, category_name_en, category_name_es, category_name_tr, description_en, description_es, description_tr, display_order) VALUES

  (opening_rating_id,
   'APPETIZER/SALAD STATION REFILLED',
   'ESTACIÓN DE APERITIVOS/ENSALADA RELLENADA',
   'APERATİF/SALATA İSTASYONU DOLDURULDU',
   'PM pars met; clean containers; backups wrapped',
   'Pares PM cumplidos; contenedores limpios; respaldos envueltos',
   'PM eşit seviyeleri karşılandı; temiz konteynerler; yedekler sarıldı',
   1),

  (opening_rating_id,
   'MAIN FRIDGE REFILLED',
   'REFRIGERADOR PRINCIPAL RELLENADO',
   'ANA BUZDOLABI DOLDURULDU',
   'Greens/veggies rotated; sauces topped & dated',
   'Verduras rotadas; salsas completadas y fechadas',
   'Yeşillikler/sebzeler döndürüldü; soslar tamamlandı ve tarihlendi',
   2),

  (opening_rating_id,
   'MEAT/GYRO STATION CLEAN & STOCKED',
   'ESTACIÓN DE CARNE/GYROS LIMPIA Y SURTIDA',
   'ET/GYROS İSTASYONU TEMİZ VE STOKLU',
   'Cutting area clean; meat/garbanzo pans topped',
   'Área de corte limpia; bandejas de carne/garbanzo completadas',
   'Kesme alanı temiz; et/nohut tavaları tamamlandı',
   3),

  (opening_rating_id,
   'RICE & POTATOES',
   'ARROZ Y PAPAS',
   'PİLAV VE PATATESLER',
   'Fresh rice timed for PM; blanched potatoes at par',
   'Arroz fresco programado para PM; papas blanqueadas al par',
   'PM için zamanlanmış taze pilav; haşlanmış patatesler eşit seviyede',
   4),

  (opening_rating_id,
   'SURFACES & ORGANIZATION',
   'SUPERFICIES Y ORGANIZACIÓN',
   'YÜZEYLER VE ORGANİZASYON',
   'Stations wiped/sanitized; clutter-free',
   'Estaciones limpiadas/sanitizadas; libres de desorden',
   'İstasyonlar silindi/temizlendi; dağınıklık yok',
   5),

  (opening_rating_id,
   'PITA & TO-GO',
   'PITA Y PARA LLEVAR',
   'PİDE VE PAKET',
   'Pita counts set; to-go supplies stocked',
   'Conteos de pita establecidos; suministros para llevar surtidos',
   'Pide sayıları ayarlandı; paket malzemeleri stoklandı',
   6),

  (opening_rating_id,
   'GYRO READINESS',
   'PREPARACIÓN DE GYROS',
   'GYROS HAZIRLIĞI',
   'New gyros loaded if needed; drip trays not overfull',
   'Nuevos gyros cargados si es necesario; bandejas de goteo no muy llenas',
   'Gerekirse yeni gyroslar yüklendi; damla tepsileri çok dolu değil',
   7),

  (opening_rating_id,
   'FLOORS & SPOT-MOPPING',
   'PISOS Y TRAPEADO DE MANCHAS',
   'ZEMİNLER VE NOKTA PASPASLAMASI',
   'No debris; safe, dry work zones',
   'Sin escombros; zonas de trabajo seguras y secas',
   'Moloz yok; güvenli, kuru çalışma alanları',
   8),

  (opening_rating_id,
   'HANDOFF NOTES QUALITY',
   'CALIDAD DE NOTAS DE ENTREGA',
   'DEVİR NOTLARI KALİTESİ',
   'Clear 86 risks, low stock, equipment issues flagged',
   'Riesgos 86 claros, stock bajo, problemas de equipo señalados',
   'Net 86 riskleri, düşük stok, ekipman sorunları işaretlendi',
   9);

  RAISE NOTICE '✅ OPENING/TRANSITION RATING categories created (9 total)!';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ BOH CHECKLISTS INSERTED SUCCESSFULLY!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 3 complete checklists:';
  RAISE NOTICE '';
  RAISE NOTICE '1. AM CLEANING CHECKLIST';
  RAISE NOTICE '   - 2 sections: FLOORS (9 tasks), BATHROOMS (8 tasks)';
  RAISE NOTICE '   - All tasks in English, Spanish, Turkish';
  RAISE NOTICE '';
  RAISE NOTICE '2. CLOSER RATING (DUE 10AM)';
  RAISE NOTICE '   - 11 rating categories (1-5 scale)';
  RAISE NOTICE '   - AM/Opening Line Cooks rate closers';
  RAISE NOTICE '   - All categories in English, Spanish, Turkish';
  RAISE NOTICE '';
  RAISE NOTICE '3. OPENING/TRANSITION RATING (DUE 5PM)';
  RAISE NOTICE '   - 9 rating categories (1-5 scale)';
  RAISE NOTICE '   - PM/Closers rate opening crew';
  RAISE NOTICE '   - All categories in English, Spanish, Turkish';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '   - Access boh.html to see the checklists';
  RAISE NOTICE '   - Add language toggle to switch between EN/ES/TR';
  RAISE NOTICE '   - Test notes and photo uploads';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
END $$;
