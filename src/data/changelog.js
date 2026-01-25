export const CHANGELOG = [
  {
    version: "1.3.4",
    title: {
      en: "Customer Portal Print Fixes, UI Spacing Standardization & Modal UX Improvements",
      tr: "Müşteri Portal Yazdırma Düzeltmeleri, Boşluk Standardizasyonu ve Modal UX İyileştirmeleri",
    },
    sections: [
      {
        label: {
          en: "Customer Public Page (Portal)",
          tr: "Müşteri Portal Sayfası",
        },
        items: {
          en: [
            "Customer public page now uses an expandable Job modal with Parts details (same structure as internal UI)",
            "Fixed issues where Print could open a blank page in customer portal",
            "Date range filtering now prints only filtered records; default print prints full history",
          ],
          tr: [
            "Müşteri portalında işler artık modal ile açılıp parça detaylarını gösterir (iç ekranla aynı yapı)",
            "Müşteri portalında yazdırma sırasında oluşan boş sayfa problemi giderildi",
            "Tarih filtresi varken sadece filtrelenen kayıtlar yazdırılır; filtre yoksa normal şekilde tüm kayıtlar yazdırılır",
          ],
        },
      },

      {
        label: {
          en: "Printing & PDF Layout",
          tr: "Yazdırma ve PDF Düzeni",
        },
        items: {
          en: [
            "Improved print page spacing and padding for a more compact invoice layout",
            "Removed unnecessary background styling from printed lists for a cleaner output",
            "Prevented tables from splitting between pages; blocks move to next page when space is insufficient",
          ],
          tr: [
            "Daha kompakt ve profesyonel çıktı için yazdırma boşlukları ve padding düzenlendi",
            "Daha temiz çıktı için yazdırma listelerindeki gereksiz arka planlar kaldırıldı",
            "Tabloların sayfa arasında bölünmesi engellendi; yer yoksa blok bir sonraki sayfaya taşınır",
          ],
        },
      },

      {
        label: {
          en: "UI Spacing & Layout Consistency",
          tr: "Boşluk ve Yerleşim Tutarlılığı",
        },
        items: {
          en: [
            "Standardized page padding across Home, Customers, Calendar, and Settings",
            "Adjusted search bar spacing so it aligns flush with the top on supported pages",
            "Calendar spacing improved for Day/Week/Month views",
            "Customer list outer padding balanced equally on left and right",
          ],
          tr: [
            "Anasayfa, Müşteriler, Takvim ve Ayarlar sayfalarında padding/boşluk standardı getirildi",
            "Arama kutusu üst boşluğu giderilerek sayfanın en üstüne hizalandı",
            "Takvim Gün/Hafta/Ay görünümlerinde üst boşluklar düzenlendi",
            "Müşteri listesinin dış boşlukları sağ/sol eşit olacak şekilde düzeltildi",
          ],
        },
      },

      {
        label: {
          en: "Navigation & Modal UX",
          tr: "Navigasyon ve Modal UX",
        },
        items: {
          en: [
            "Back button issues fixed in Updates and Advanced Settings",
            "Added clear Close actions to modals to prevent being stuck inside",
            "Modal content now ends cleanly under action buttons (removed unnecessary expansion)",
          ],
          tr: [
            "Güncellemeler ve Gelişmiş Ayarlar ekranlarında geri tuşu sorunu giderildi",
            "Modallarda net bir Kapat/Çıkış aksiyonu eklendi (modalden çıkamama sorunu giderildi)",
            "Modal içerikleri butonların hemen altında bitecek şekilde gereksiz uzamalar kaldırıldı",
          ],
        },
      },

      {
        label: {
          en: "Business Logic & Defaults",
          tr: "Mantık ve Varsayılanlar",
        },
        items: {
          en: [
            "Dashboard now opens with the default currency selected automatically",
            "Due Tracking and Active Jobs sections now load collapsed by default",
            "Customer totals no longer change unexpectedly when adjusting date filters (fixed recalculation behavior)",
            "Negative totals now show a leading minus sign consistently (Debt and Balance)",
          ],
          tr: [
            "Dashboard varsayılan para birimi seçili şekilde açılır",
            "Vade Takibi ve Aktif İşler bölümleri varsayılan olarak kapalı gelir",
            "Tarih filtresi değişince toplamların beklenmedik şekilde değişmesi engellendi",
            "Negatif değerlerde (Toplam Borç / Bakiye) eksi işareti tutarlı şekilde gösterilir",
          ],
        },
      },

      {
        label: {
          en: "Data Entry & Validation",
          tr: "Veri Girişi ve Doğrulama",
        },
        items: {
          en: [
            "Email input now enforces lowercase and English characters only",
            "Phone input no longer keeps extra spaces when pasting numbers",
            "New customer form now clears previous customer data properly when reopening",
          ],
          tr: [
            "E-posta alanı artık her zaman küçük harf ve sadece İngiliz karakterlerini kabul eder",
            "Telefon numarası yapıştırıldığında boşluklar otomatik temizlenir",
            "Yeni müşteri ekleme ekranı tekrar açıldığında önceki müşteri verileri otomatik temizlenir",
          ],
        },
      },

      {
        label: {
          en: "Vault & Job Tracking",
          tr: "Kasa ve İş Takibi",
        },
        items: {
          en: [
            "Vault now includes a dedicated Payments list section under the summary",
            "When Job Tracking is closed and no active jobs remain, Active/Completed sections are hidden",
          ],
          tr: [
            "Kasa ekranında özetin altında Tahsilat listesi bölümü eklendi",
            "İş Takibi kapatıldığında ve aktif iş yoksa Aktif/Tamamlanan bölümleri otomatik gizlenir",
          ],
        },
      },

      {
        label: {
          en: "Theme & Translations",
          tr: "Tema ve Çeviriler",
        },
        items: {
          en: [
            "Dark Mode toggle added inside Advanced Settings (Part 1)",
            "Updated Turkish translation values in translate.js",
            "Job modal background standardized to universal white for consistent readability",
          ],
          tr: [
            "Gelişmiş Ayarlar (Part 1) içine Dark Mode seçeneği eklendi",
            "translate.js içindeki Türkçe değerler güncellendi",
            "Job modal arka planı okunabilirlik için evrensel beyaz olarak standartlaştırıldı",
          ],
        },
      },
    ],
  },

  {
    version: "1.3.3",
    title: {
      en: "Financial Logic Fixes, Due Tracking Dashboard & Mobile UX Improvements",
      tr: "Finansal Mantık Düzeltmeleri, Vade Takibi Dashboard ve Mobil UX İyileştirmeleri",
    },
    sections: [
      {
        label: {
          en: "Financial Logic & Calculations",
          tr: "Finansal Mantık ve Hesaplamalar",
        },
        items: {
          en: [
            "Fixed all calculation logic for Total Debt, Total Payments, and Total Balance",
            "Corrected Payment Due logic for past due, upcoming due, and total due amounts",
            "Completed Jobs now correctly display the last 10 confirmed transactions",
            "Ensured financial summaries always reflect accurate and up-to-date data",
          ],
          tr: [
            "Toplam Borç, Toplam Tahsilat ve Toplam Bakiye hesaplama mantıkları düzeltildi",
            "Geçmiş vade, yaklaşan vade ve toplam vade tutarları için hesaplama hataları giderildi",
            "Tamamlanan işler artık son 10 onaylanmış işlemi doğru şekilde gösterir",
            "Finansal özetlerin her zaman güncel ve doğru verileri yansıtması sağlandı",
          ],
        },
      },

      {
        label: {
          en: "Due Tracking & Dashboard",
          tr: "Vade Takibi ve Dashboard",
        },
        items: {
          en: [
            "Due Tracking (Vade Takibi) added directly to the Dashboard",
            "Improved visual consistency between Due Watch and Financial Summary",
            "Refined color scheme for clearer due status visibility",
          ],
          tr: [
            "Vade Takibi dashboard ekranına eklendi",
            "Vade Takibi ile Finansal Özet arasındaki görsel uyum iyileştirildi",
            "Vade durumlarını daha net göstermek için renkler düzenlendi",
          ],
        },
      },

      {
        label: {
          en: "Multi-Currency Safety & Debt Flow",
          tr: "Çoklu Para Birimi Güvenliği ve Borç Akışı",
        },
        items: {
          en: [
            "Strengthened multi-currency rules to prevent currency mixing",
            "Jobs, debts, and payments now strictly respect their assigned currency",
            "Initial debt creation can exist without currency until first payment",
            "Currency is automatically assigned from system rules on first payment",
          ],
          tr: [
            "Farklı para birimlerinin karışmasını önlemek için çoklu para birimi kuralları güçlendirildi",
            "İşler, borçlar ve tahsilatlar kendi para birimine sıkı şekilde bağlıdır",
            "İlk borçlandırma işleminde para birimi zorunlu değildir",
            "İlk tahsilat ile birlikte para birimi sistemden otomatik atanır",
          ],
        },
      },

      {
        label: {
          en: "Transaction History & Printing",
          tr: "İşlem Geçmişi ve Yazdırma",
        },
        items: {
          en: [
            "Transaction History now supports filtering",
            "Added print option for Transaction History",
            "Users can print only last month’s transactions",
          ],
          tr: [
            "İşlem Geçmişi için filtreleme desteği eklendi",
            "İşlem Geçmişi yazdırma özelliği eklendi",
            "Sadece geçen aya ait işlemler yazdırılabilir",
          ],
        },
      },

      {
        label: {
          en: "Invoices & Customer Presentation",
          tr: "Faturalar ve Müşteri Sunumu",
        },
        items: {
          en: [
            "Invoice print layout redesigned to be simple and professional",
            "Removed unnecessary decorative elements from invoice design",
            "Parts and Labor are now shown together in a clear layout",
            "Improved customer-facing public invoice appearance",
          ],
          tr: [
            "Fatura yazdırma tasarımı daha sade ve profesyonel hale getirildi",
            "Fatura tasarımındaki gereksiz süslemeler kaldırıldı",
            "Parça ve işçilik bilgileri birlikte ve net şekilde gösterilir",
            "Müşteriye açık fatura görünümü iyileştirildi",
          ],
        },
      },

      {
        label: {
          en: "Mobile UX & Layout Cleanup",
          tr: "Mobil UX ve Yerleşim Düzenlemeleri",
        },
        items: {
          en: [
            "All modals now open in full-screen mode on mobile devices",
            "Reduced multiple scroll areas into a single unified scroll",
            "Primary UI color standardized to blue",
            "When New Job button is disabled, Debt and Payment actions are centered automatically",
          ],
          tr: [
            "Mobil cihazlarda tüm modallar tam ekran olacak şekilde düzenlendi",
            "Çift scroll yapısı kaldırılarak tek scroll kullanımına geçildi",
            "Ana arayüz rengi mavi olarak standartlaştırıldı",
            "Yeni İş butonu kapalıyken Borç ve Tahsilat alanları otomatik ortalanır",
          ],
        },
      },
    ],
  },
  {
    version: "1.3.2",
    title: {
      en: "Sharing, Data Tools, Language UI & Stability Improvements",
      tr: "Paylaşım, Veri Araçları, Dil Arayüzü ve Kararlılık İyileştirmeleri",
    },
    sections: [
      {
        label: {
          en: "Sharing, Portal & Printing",
          tr: "Paylaşım, Portal ve Yazdırma",
        },
        items: {
          en: [
            "Vault print view added for detailed Vault reporting",
            "When clicking Mail or WhatsApp, the Customer Portal link is now included automatically",
            "Customer Portal link is shared consistently across all sharing methods",
          ],
          tr: [
            "Detaylı Kasa raporları için Kasa Yazdırma görünümü eklendi",
            "Mail veya WhatsApp butonuna basıldığında Müşteri Portalı linki otomatik olarak gönderilir",
            "Müşteri Portalı linki tüm paylaşım yöntemlerinde tutarlı şekilde gönderilir",
          ],
        },
      },

      {
        label: {
          en: "Language & UI Adjustments",
          tr: "Dil ve Arayüz Düzenlemeleri",
        },
        items: {
          en: [
            "Language toggle alignment issue fixed in Advanced Settings",
            "Introduced a unified Language Toggle modal for English, German, and Turkish",
            "Language selection behavior standardized across the application",
          ],
          tr: [
            "Gelişmiş Ayarlar bölümündeki dil butonunun hizalama sorunu giderildi",
            "İngilizce, Almanca ve Türkçe için birleşik Dil Değiştirme modalı eklendi",
            "Dil seçimi davranışı uygulama genelinde standart hale getirildi",
          ],
        },
      },

      {
        label: {
          en: "Data Tools & Reliability",
          tr: "Veri Araçları ve Güvenilirlik",
        },
        items: {
          en: [
            "Data Export feature added for backing up user data",
            "Data Import feature added for restoring exported data",
            "Verified export / import integrity across customers, jobs, payments, and vaults",
          ],
          tr: [
            "Kullanıcı verilerini yedeklemek için Veri Dışa Aktarma özelliği eklendi",
            "Dışa aktarılan verileri geri yüklemek için Veri İçe Aktarma özelliği eklendi",
            "Müşteriler, işler, tahsilatlar ve kasalar için veri bütünlüğü doğrulandı",
          ],
        },
      },

      {
        label: {
          en: "Stability, Code Quality & Automation",
          tr: "Kararlılık, Kod Kalitesi ve Otomasyon",
        },
        items: {
          en: [
            "Codebase reviewed using AI-assisted analysis to fix common logic and state errors",
            "Improved overall application stability and reduced edge-case failures",
          ],
          tr: [
            "Yaygın mantık ve state hatalarını düzeltmek için kod tabanı AI destekli analizden geçirildi",
            "Uygulama genelinde kararlılık artırıldı ve kenar durum hataları azaltıldı",
          ],
        },
      },

      {
        label: {
          en: "Authentication & Backend Migration",
          tr: "Kimlik Doğrulama ve Backend Geçişi",
        },
        items: {
          en: [
            "Email change flow issues in Firebase identified and isolated",
            "Email change functionality prepared for migration to Express.js backend",
          ],
          tr: [
            "Firebase üzerindeki e-posta değiştirme sorunları tespit edildi ve izole edildi",
            "E-posta değiştirme işlemi Express.js backend altyapısına taşınmak üzere hazırlandı",
          ],
        },
      },
    ],
  },

  {
    version: "1.3.1",
    title: {
      en: "Job Creation UX, Due Date Logic & Input Validation Improvements",
      tr: "İş Oluşturma UX, Vade Tarihi Mantığı ve Girdi Doğrulamaları",
    },
    sections: [
      {
        label: {
          en: "Debt, Currency & Financial Flow",
          tr: "Borç, Para Birimi ve Finans Akışı",
        },
        items: {
          en: [
            "Users can now add Debt without selecting a currency first",
            "Customer currency is assigned automatically on first Payment (Tahsilat)",
            "Customer balances no longer display any currency symbol before the first payment",
            "Removed incorrect default TRY symbol from early debt records",
          ],
          tr: [
            "Kullanıcılar artık para birimi seçmeden borç ekleyebilir",
            "Müşteri para birimi ilk Tahsilat işlemiyle otomatik olarak belirlenir",
            "İlk tahsilat öncesinde müşteri bakiyesinde para birimi simgesi gösterilmez",
            "İlk borç işlemlerinde görünen varsayılan TRY simgesi kaldırıldı",
          ],
        },
      },

      {
        label: {
          en: "Job Creation & Due Date Handling",
          tr: "İş Oluşturma ve Vade Tarihi",
        },
        items: {
          en: [
            "30-Day Payment Tracking renamed to Due Tracking",
            "Payment Due is now selected as a Date instead of day count",
            "Default due date is auto-calculated from the Job Date (30 days)",
            "Due Date field is positioned directly under Job Date",
            "Users can freely select longer due dates (e.g. 60 days)",
            "Removed yellow info warning from Fixed Time job mode",
          ],
          tr: [
            "30 Günlük Ödeme Takibi adı Vade Takibi olarak değiştirildi",
            "Ödeme Vadesi artık gün sayısı yerine tarih olarak seçilir",
            "Varsayılan vade tarihi iş tarihinden otomatik 30 gün sonrası olarak hesaplanır",
            "Vade Tarihi alanı İş Tarihi altına taşındı",
            "Kullanıcılar 60 gün gibi daha uzun vadeler seçebilir",
            "Sabit Ücret çalışma modundaki sarı bilgilendirme alanı kaldırıldı",
          ],
        },
      },

      {
        label: {
          en: "Inputs, Validation & UX Cleanup",
          tr: "Girdi Doğrulamaları ve UX Temizliği",
        },
        items: {
          en: [
            "Customer selection label removed from Job creation screen",
            "Date labels removed and replaced with placeholders to save space",
            "Customer selection input now includes a clear (✕) button",
            "Hourly Rate can no longer be negative",
            "Hourly Rate currency label moved inside the input",
            "Lunch Break input no longer shows default zero value",
            "Removed green currency symbol from Fixed Price jobs",
          ],
          tr: [
            "İş oluşturma ekranındaki Müşteri Seç etiketi kaldırıldı",
            "Tarih etiketleri kaldırılarak placeholder kullanıldı",
            "Müşteri seçim alanına temizleme (✕) butonu eklendi",
            "Saatlik Ücret alanında negatif değer girilmesi engellendi",
            "Saatlik Ücret para birimi bilgisi input içine alındı",
            "Mola alanındaki varsayılan 0 değeri kaldırıldı",
            "Sabit Ücret alanındaki yeşil para birimi simgesi kaldırıldı",
          ],
        },
      },

      {
        label: {
          en: "UI Consistency & Layout",
          tr: "Arayüz Tutarlılığı ve Yerleşim",
        },
        items: {
          en: [
            "All arrows and expandable indicators standardized to the same size",
            "All cards and boxes now follow consistent sizing rules",
            "CSS files consolidated for easier maintenance",
            "Language icon added to Settings page",
          ],
          tr: [
            "Tüm ok ikonları ve açılır göstergeler aynı boyuta getirildi",
            "Kartlar ve kutular için tutarlı ölçüler sağlandı",
            "CSS dosyaları birleştirilerek sadeleştirildi",
            "Ayarlar sayfasına dil ikonu eklendi",
          ],
        },
      },

      {
        label: {
          en: "Calendar, Jobs & Access Control",
          tr: "Takvim, İşler ve Erişim Kontrolü",
        },
        items: {
          en: [
            "Customer selection in Calendar reservation now defaults to 'Select customer'",
            "New Advanced Setting added to enable / disable Job creation and FAB button",
            "When disabled, users cannot create Jobs",
          ],
          tr: [
            "Takvimden yeni randevu oluştururken müşteri alanı varsayılan olarak 'Müşteri Seçiniz' olur",
            "İş oluşturma ve FAB butonunu açıp kapatmak için yeni Gelişmiş Ayar eklendi",
            "Devre dışı bırakıldığında kullanıcılar iş oluşturamaz",
          ],
        },
      },

      {
        label: {
          en: "Authentication & Registration",
          tr: "Kayıt ve Kimlik Doğrulama",
        },
        items: {
          en: [
            "Registration screen now includes Name, Phone, and Address fields",
            "These fields are automatically synced to the user Profile after signup",
            "Phone number input now blocks letters and spaces",
            "Phone numbers are enforced as continuous digits with optional leading +",
          ],
          tr: [
            "Kayıt ol ekranına Ad, Telefon ve Adres alanları eklendi",
            "Bu bilgiler kayıt sonrası otomatik olarak Profil’e yansıtılır",
            "Telefon numarası alanında harf ve boşluk girişi engellendi",
            "Telefon numarası bitişik rakamlar ve opsiyonel + ile sınırlandı",
          ],
        },
      },
    ],
  },

  {
    version: "1.3.0",
    title: {
      en: "Currency Consistency, Vault Rules & Critical Data Integrity Fixes",
      tr: "Para Birimi Tutarlılığı, Kasa Kuralları ve Kritik Veri Düzeltmeleri",
    },
    sections: [
      {
        label: {
          en: "Currency & Localization Fixes",
          tr: "Para Birimi ve Yerelleştirme Düzeltmeleri",
        },
        items: {
          en: [
            "Fixed Customer Detail page showing TRY even when customer was registered under a Euro Vault",
            "Customer balance, total payment, and total debt now correctly reflect the customer’s actual currency",
            "Fixed issue where selecting Turkish language forced customer currencies to display as TRY",
            "Ensured currency symbols, names, and icons are consistent across the system",
            "Removed mixed currency representations and standardized currency formatting",
            "System now enforces a single currency per user",
            "Selecting a Vault with a different currency now throws a validation error",
          ],
          tr: [
            "Euro kasa seçilmesine rağmen Müşteri Detay sayfasında TRY görünmesi sorunu giderildi",
            "Müşteri bakiye, toplam tahsilat ve toplam borç artık doğru para birimini gösterir",
            "Türkçe dil seçildiğinde para birimlerinin TRY olarak görünmesi sorunu düzeltildi",
            "Para birimi simgeleri, isimleri ve ikonları sistem genelinde tutarlı hale getirildi",
            "Karışık para birimi gösterimleri kaldırıldı ve standartlaştırıldı",
            "Sistem artık kullanıcı başına tek para birimini zorunlu kılar",
            "Farklı para birimine sahip kasa seçildiğinde hata mesajı gösterilir",
          ],
        },
      },

      {
        label: {
          en: "Debt, Payment & Data Persistence",
          tr: "Borç, Tahsilat ve Veri Kaydetme",
        },
        items: {
          en: [
            "Fixed issue where 'Borçlandır – Ödeme Vadesi (Gün)' field could not be cleared",
            "Fixed critical bug where subsequent Debt and Payment changes were not being saved",
            "Tahsilat and Borç records now persist correctly after the first transaction",
            "Customer total debt now correctly displays positive or negative sign",
            "Ensured no debt can ever be recorded against a Vault",
          ],
          tr: [
            "'Borçlandır – Ödeme Vadesi (Gün)' alanındaki rakam silinememe sorunu giderildi",
            "İlk işlemden sonra borç ve tahsilat değişikliklerinin kaydedilmemesi hatası düzeltildi",
            "Tahsilat ve Borç kayıtları artık her işlem sonrası doğru şekilde kaydedilir",
            "Müşteri toplam borç alanında pozitif / negatif işaretler doğru gösterilir",
            "Kasaya hiçbir koşulda borç işlenememesi sağlandı",
          ],
        },
      },

      {
        label: {
          en: "Vault Rules & Safety Constraints",
          tr: "Kasa Kuralları ve Güvenlik Kısıtlamaları",
        },
        items: {
          en: [
            "Vaults can no longer be deleted if they contain invoices",
            "Invoices must be moved to another Vault before deletion is allowed",
            "Vault deletion is fully blocked if any transactions exist",
            "Prevented accidental deletion that removed customer payment history",
            "Vaults now only track Total Payments",
            "Removed Total Debt and Balance from Vaults",
            "Vault balances are no longer allowed to go negative",
          ],
          tr: [
            "İçinde fatura bulunan kasaların silinmesi engellendi",
            "Kasa silinmeden önce faturaların başka bir kasaya taşınması zorunlu hale getirildi",
            "İşlem içeren kasalar hiçbir şekilde silinemez",
            "Müşteri tahsilatlarının silinmesine neden olan hatalı kasa silme durumu engellendi",
            "Kasalar artık yalnızca Toplam Tahsilat bilgisini tutar",
            "Kasalar için Toplam Borç ve Bakiye alanları kaldırıldı",
            "Kasa bakiyesinin negatif olmasına izin verilmez",
          ],
        },
      },

      {
        label: {
          en: "Jobs, History & Business Logic",
          tr: "İşler, Geçmiş ve İş Mantığı",
        },
        items: {
          en: [
            "Removed Vault selection option from Job creation",
            "Jobs no longer directly assign a Vault",
            "Vault selection is now only allowed during Tahsilat (Payment)",
            "Borç records no longer require or allow Vault selection",
            "Job history now correctly includes break durations",
            "Fixed mismatch between job duration and recorded break time",
            "Completed jobs now display a red indicator on the left side for clarity",
          ],
          tr: [
            "İş oluşturma ekranından Kasa seçeneği kaldırıldı",
            "İşler artık doğrudan bir kasaya bağlanmaz",
            "Kasa seçimi yalnızca Tahsilat sırasında yapılabilir",
            "Borç kayıtlarında kasa seçimi kaldırıldı",
            "İş geçmişi artık mola sürelerini doğru şekilde içerir",
            "İş süresi ile mola süresi arasındaki uyumsuzluk giderildi",
            "Tamamlanan işler sol tarafta kırmızı gösterge ile vurgulanır",
          ],
        },
      },

      {
        label: {
          en: "Calendar & Date Handling",
          tr: "Takvim ve Tarih İşlemleri",
        },
        items: {
          en: [
            "Fixed Calendar app button behavior",
            "Resolved issue where calendar dates were off by one day",
            "Calendar UI date and displayed job date are now fully synchronized",
            "Standardized date format to European (DD.MM.YYYY)",
          ],
          tr: [
            "Takvim uygulama butonu davranışı düzeltildi",
            "Takvimde bir gün kayma sorunu giderildi",
            "Takvim arayüzündeki tarih ile iş tarihi artık birebir uyumludur",
            "Tarih formatı Avrupa standardına (GG.AA.YYYY) çevrildi",
          ],
        },
      },

      {
        label: {
          en: "Authentication & Access",
          tr: "Kimlik Doğrulama ve Erişim",
        },
        items: {
          en: [
            "Added 'Forgot Password' option to the main login screen",
            "Email change flow fully fixed and stabilized",
          ],
          tr: [
            "Ana giriş ekranına 'Şifremi Unuttum' seçeneği eklendi",
            "E-posta değiştirme süreci tamamen düzeltildi ve kararlı hale getirildi",
          ],
        },
      },

      {
        label: {
          en: "Settings & UX Cleanup",
          tr: "Ayarlar ve UX Düzenlemeleri",
        },
        items: {
          en: ["Moved Language Toggle button into Advanced Settings"],
          tr: ["Dil Değiştirme butonu Gelişmiş Ayarlar içine taşındı"],
        },
      },
    ],
  },

  {
    version: "1.2.9",
    title: {
      en: "Language Toggle Expansion, Pay Watch Enhancements & Mobile UI Fixes",
      tr: "Dil Değiştirme Genişletmeleri, Ödeme Takibi ve Mobil Arayüz Düzeltmeleri",
    },
    sections: [
      {
        label: {
          en: "Language & Internationalization",
          tr: "Dil ve Uluslararasılaştırma",
        },
        items: {
          en: [
            "Added language toggle support for English, German, and Turkish across the entire app",
            "Added language toggle support for English, German, and Turkish on all pages",
            "Improved overall language consistency between App-level and Page-level translations",
          ],
          tr: [
            "Uygulama genelinde İngilizce, Almanca ve Türkçe dil değiştirme desteği eklendi",
            "Tüm sayfalara İngilizce, Almanca ve Türkçe dil değiştirme özelliği eklendi",
            "Uygulama ve sayfa bazlı çeviriler arasındaki tutarlılık iyileştirildi",
          ],
        },
      },

      {
        label: {
          en: "Payments, Debt & Pay Watch List",
          tr: "Ödemeler, Borç ve Ödeme Takibi",
        },
        items: {
          en: [
            "Added Due Date support when creating a Debt (e.g. 20, 30, or 60 days)",
            "Debts with a due date now appear in the Pay Watch list",
            "Create Job flow now supports assigning a Due Date",
            "Jobs with delayed payment can now be tracked in the Pay Watch list",
            "Added ability to manually add a Job to the Pay Watch list",
            "Pay Watch list now allows assigning different due dates per job",
            "Existing remove button in Pay Watch list preserved and improved",
          ],
          tr: [
            "Borç oluştururken Vade Tarihi ekleme desteği eklendi (örn. 20, 30 veya 60 gün)",
            "Vadesi olan borçlar artık Ödeme Takip listesinde görünür",
            "İş oluşturma sırasında Vade Tarihi atanabilir",
            "Maaş gecikmesi olan işler Ödeme Takip listesine eklenebilir",
            "Bir işin manuel olarak Ödeme Takip listesine eklenmesi sağlandı",
            "Ödeme Takip listesinde her iş için farklı vade tanımlanabilir",
            "Ödeme Takip listesindeki kaldırma butonu korunarak iyileştirildi",
          ],
        },
      },

      {
        label: {
          en: "Calendar & Scheduling Fixes",
          tr: "Takvim ve Zamanlama Düzeltmeleri",
        },
        items: {
          en: [
            "Calendar day cells resized to a more compact layout",
            "Weekly calendar view now correctly displays both Jobs and Reservations",
            "Daily calendar page visibility issue fixed",
            "Clock In / Clock Out system fixed where Clock Out was not appearing",
            "Reservations now appear as green dots and Jobs as red dots on the calendar",
            "Calendar dot indicators now correctly display one red (Job) and one green (Reservation)",
          ],
          tr: [
            "Takvim gün hücreleri daha kompakt hale getirildi",
            "Haftalık takvim görünümünde İşler ve Rezervasyonlar artık doğru şekilde görünür",
            "Günlük takvim sayfasının görünmemesi sorunu giderildi",
            "Saat Giriş / Saat Çıkış sisteminde Saat Çıkış görünmeme sorunu düzeltildi",
            "Rezervasyonlar takvimde yeşil, işler kırmızı nokta olarak gösterilir",
            "Takvimde bir kırmızı (İş) ve bir yeşil (Rezervasyon) nokta doğru şekilde gösterilir",
          ],
        },
      },

      {
        label: {
          en: "Navigation, Layout & Mobile UI",
          tr: "Navigasyon, Yerleşim ve Mobil Arayüz",
        },
        items: {
          en: [
            "Split App.css into smaller, more maintainable files",
            "Fixed mobile UI layout issues caused by Navigation Bar and FAB",
            "Navigation Bar width adjusted to properly fit app content",
            "Address display issues fixed where long addresses broke layout",
            "Profile address display now truncates long text with ellipsis (…) for stability",
          ],
          tr: [
            "App.css daha küçük ve yönetilebilir dosyalara ayrıldı",
            "Mobil sürümde Navigasyon Barı ve FAB kaynaklı arayüz bozulmaları giderildi",
            "Navigasyon Barı genişliği uygulama içeriğine uyumlu hale getirildi",
            "Uzun adreslerin arayüzü bozması sorunu düzeltildi",
            "Profil adresleri uzun olduğunda artık (…) ile kısaltılır",
          ],
        },
      },

      {
        label: {
          en: "Advanced Settings & Profile Cleanup",
          tr: "Gelişmiş Ayarlar ve Profil Düzenlemeleri",
        },
        items: {
          en: [
            "Created a new Advanced Settings section",
            "Moved Password Reset and Calendar Toggle into Advanced Settings",
            "Removed old Password Reset and Calendar Toggle from previous locations",
            "Introduced a new Password Change modal inside Advanced Settings",
            "Profile Settings cleaned up by removing password, calendar toggle, and email update options",
            "Advanced Settings renamed and localized as 'Gelişmiş Ayarlar'",
          ],
          tr: [
            "Yeni bir Gelişmiş Ayarlar bölümü oluşturuldu",
            "Şifre Sıfırlama ve Takvim Toggle ayarları Gelişmiş Ayarlar içine taşındı",
            "Eski konumlardaki Şifre ve Takvim ayarları kaldırıldı",
            "Gelişmiş Ayarlar içinde yeni bir Şifre Değiştirme modalı eklendi",
            "Profil Ayarları’ndan şifre, takvim toggle ve e-posta güncelleme seçenekleri kaldırıldı",
            "Gelişmiş Ayarlar başlığı Türkçeleştirildi",
          ],
        },
      },

      {
        label: {
          en: "Vaults, Currency & Job Pricing",
          tr: "Kasalar, Para Birimi ve İş Ücretleri",
        },
        items: {
          en: [
            "Fixed issue where Vault modal closed unexpectedly after editing a Vault",
            "Hourly Rate no longer uses static TRY currency",
            "Job creation now correctly follows the selected Vault currency",
            "Fixed issue where selecting a Euro Vault still created jobs in TL",
          ],
          tr: [
            "Kasa düzenleme sonrası Kasa modalının beklenmedik şekilde kapanması sorunu giderildi",
            "Saatlik Ücret alanındaki sabit TRY kullanımı kaldırıldı",
            "İş oluşturma artık seçilen kasanın para birimini kullanır",
            "Euro kasa seçildiğinde işlerin TL olarak oluşturulması sorunu düzeltildi",
          ],
        },
      },

      {
        label: {
          en: "UX Text & Interaction Improvements",
          tr: "UX Metin ve Etkileşim İyileştirmeleri",
        },
        items: {
          en: [
            "Replaced 'Saat Giriş / Çıkış' labels with clearer 'Başlat / Bitir' wording",
            "Address fields are now clickable and open Google Maps",
          ],
          tr: [
            "'Saat Giriş / Çıkış' metni daha anlaşılır 'Başlat / Bitir' olarak değiştirildi",
            "Adres alanları artık tıklanabilir ve Google Haritalar’da açılır",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.8",
    title: {
      en: "Calendar UX, Portal Scoping & Print Detail Improvements",
      tr: "Takvim UX, Portal Kapsamı ve Yazdırma Detay İyileştirmeleri",
    },
    sections: [
      {
        label: { en: "Calendar & Scheduling", tr: "Takvim ve Zamanlama" },
        items: {
          en: [
            "Removed unused search bar from the Calendar view",
            "Calendar no longer takes up the full screen height",
            "Calendar layout adjusted to a compact view showing only a few upcoming appointments",
            "Calendar appointment list now displays 2–3 upcoming items instead of full-page coverage",
            "Discussed and clarified that the 'Add Appointment' button is actually Job Creation, not a separate appointment system",
            "Improved clarity between Job scheduling and Calendar visualization",
          ],
          tr: [
            "Takvim görünümündeki kullanılmayan arama çubuğu kaldırıldı",
            "Takvimin tüm ekranı kaplaması engellendi",
            "Takvim görünümü daha kompakt hale getirildi",
            "Takvimde artık altta yalnızca 2–3 yaklaşan randevu gösterilir",
            "Randevu Ekle butonunun aslında İş Ekleme olduğu netleştirildi",
            "İş planlama ve takvim görselleştirmesi arasındaki ayrım daha anlaşılır hale getirildi",
          ],
        },
      },

      {
        label: {
          en: "Customer Data & Isolation Fixes",
          tr: "Müşteri Verisi ve İzolasyon Düzeltmeleri",
        },
        items: {
          en: [
            "Fixed issue where red warning sections belonging to one customer incorrectly displayed other customers’ details",
            "Ensured customer detail pages only display data related to the selected customer",
            "Public Customer Portal now shows only the transactions belonging to the linked customer",
            "Removed global transaction leakage from Customer Portal view",
          ],
          tr: [
            "Tek bir müşteriye ait kırmızı uyarı alanında diğer müşterilerin bilgilerinin görünmesi sorunu giderildi",
            "Müşteri detay sayfaları artık yalnızca seçilen müşteriye ait verileri gösterir",
            "Herkese açık Müşteri Portalı yalnızca ilgili müşterinin işlemlerini gösterir",
            "Müşteri Portalı’ndaki global işlem sızıntıları engellendi",
          ],
        },
      },

      {
        label: {
          en: "Customer Portal & Printing",
          tr: "Müşteri Portalı ve Yazdırma",
        },
        items: {
          en: [
            "Improved Customer Print and Customer Portal consistency",
            "Customer print output now matches Customer Portal data exactly",
            "Added detailed job breakdown to printed customer statements",
            "Parts used in jobs are now included in print output with full detail",
            "Customer statements now provide a clearer and more professional breakdown",
          ],
          tr: [
            "Müşteri Yazdırma ve Müşteri Portalı tutarlılığı iyileştirildi",
            "Müşteri yazdırma çıktısı artık Müşteri Portalı verileriyle birebir uyumludur",
            "Yazdırılan müşteri dökümlerine detaylı iş kırılımı eklendi",
            "İşlerde kullanılan parçalar yazdırma çıktısına detaylı şekilde eklendi",
            "Müşteri dökümleri daha profesyonel ve anlaşılır hale getirildi",
          ],
        },
      },

      {
        label: {
          en: "Profile, Vaults & Navigation",
          tr: "Profil, Kasalar ve Navigasyon",
        },
        items: {
          en: [
            "Fixed and improved Profile editing behavior",
            "Improved Profile data consistency across the system",
            "Added Vaults under the 'Vault Management' (Kasa Yönetimi) section",
            "Clicking Vault Management now correctly lists all Vaults",
            "Improved discoverability of Vault-related actions",
            "Removed blue header from Customer Portal and aligned it with the main theme",
          ],
          tr: [
            "Profil düzenleme davranışı düzeltildi ve iyileştirildi",
            "Profil bilgilerinin sistem genelindeki tutarlılığı artırıldı",
            "Kasalar, 'Kasa Yönetimi' başlığı altına taşındı",
            "Kasa Yönetimi’ne tıklandığında kasalar doğru şekilde listelenir",
            "Kasa ile ilgili işlemlerin erişilebilirliği artırıldı",
            "Müşteri Portalı’ndaki mavi header kaldırıldı ve tema ile uyumlu hale getirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.7",
    title: {
      en: "Time Input Fixes, Icon Cleanup & Job Flow Stability",
      tr: "Zaman Girişi Düzeltmeleri, İkon Temizliği ve İş Akışı Kararlılığı",
    },
    sections: [
      {
        label: {
          en: "Time & Job Logic Fixes",
          tr: "Zaman ve İş Mantığı Düzeltmeleri",
        },
        items: {
          en: [
            "Fixed native system time picker tilting automatically when selecting time",
            "Manual job time entry now supports Lunch Break duration",
            "Lunch Break can be set (e.g. 30 minutes) and correctly deducted from total work time",
            "Clock In / Clock Out now correctly affects Total Debt calculations",
            "After completing a Clock In / Clock Out job, job details now update correctly",
            "Fixed issue where Clock In / Clock Out jobs were not appearing in the system",
            "Fixed manual Clock In / Clock Out editing not saving changes",
            "Fixed issue where new job creation reused old job values",
            "Closing Edit Job modal no longer causes Create Job to reopen Edit mode",
            "Manual, Clock-based, and Fixed-price jobs are now consistently reflected in the system",
          ],
          tr: [
            "Zaman seçimi sırasında sistemin otomatik kayma (tilting) sorunu giderildi",
            "Manuel iş girişine Öğle Molası süresi ekleme desteği eklendi",
            "Öğle Molası (örn. 30 dakika) tanımlanabilir ve toplam çalışma süresinden düşülür",
            "Saat Giriş / Saat Çıkış artık Toplam Borç hesaplamasını doğru etkiler",
            "Saat Giriş / Saat Çıkış ile tamamlanan işlerde iş detayları artık doğru güncellenir",
            "Saat Giriş / Saat Çıkış ile oluşturulan işlerin sistemde görünmemesi sorunu giderildi",
            "Manuel Saat Giriş / Saat Çıkış düzenleme işlemlerinin kaydedilmemesi sorunu düzeltildi",
            "Yeni iş oluştururken eski iş verilerinin hatırlanması sorunu giderildi",
            "İş Düzenleme modalı kapatıldıktan sonra yeni iş oluştururken tekrar açılması engellendi",
            "Manuel, saatli ve sabit fiyatlı işler artık sistemde tutarlı şekilde görünür",
          ],
        },
      },

      {
        label: { en: "UX & UI Cleanup", tr: "UX ve Arayüz Temizliği" },
        items: {
          en: [
            "Removed all Font Awesome icons from application pages",
            "Removed all UI icon dependencies related to Font Awesome",
            "Replaced icon-based interactions with clean text-based UI where applicable",
            "Split large App.js file into smaller, maintainable modules",
            "Improved overall UI consistency after icon removal",
          ],
          tr: [
            "Uygulama sayfalarındaki tüm Font Awesome ikonları kaldırıldı",
            "Font Awesome’a bağlı tüm arayüz ikon kullanımları temizlendi",
            "İkon bazlı etkileşimler uygun yerlerde metin tabanlı hale getirildi",
            "Büyük App.js dosyası daha küçük ve yönetilebilir parçalara ayrıldı",
            "İkon temizliği sonrası genel arayüz tutarlılığı iyileştirildi",
          ],
        },
      },

      {
        label: { en: "Settings & Logs", tr: "Ayarlar ve Kayıtlar" },
        items: {
          en: [
            "Logs are now displayed only on the Settings page",
            "Removed logs from all other application pages",
            "Added Features timeline section to Settings page",
            "Added Development timeline section to Settings page",
            "System now keeps a visible record of feature additions and development progress",
          ],
          tr: [
            "Log kayıtları artık yalnızca Ayarlar sayfasında gösterilir",
            "Diğer tüm sayfalardan log görüntüleri kaldırıldı",
            "Ayarlar sayfasına Özellikler zaman çizelgesi eklendi",
            "Ayarlar sayfasına Geliştirme zaman çizelgesi eklendi",
            "Sistemin gelişimi ve eklenen özellikler artık kayıt altında tutulur",
          ],
        },
      },

      {
        label: { en: "Payments & Due Tracking", tr: "Ödeme ve Vade Takibi" },
        items: {
          en: [
            "30-day payment tracking now includes an Is Paid option",
            "When marked as paid, the item is removed from 30-day due tracking list",
            "Improved accuracy of due tracking visibility",
          ],
          tr: [
            "30 günlük ödeme takibine Ödendi seçeneği eklendi",
            "Ödendi olarak işaretlenen kayıtlar 30 günlük vade takibinden kaldırılır",
            "Vade takibi görünürlüğü ve doğruluğu iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.6",
    title: {
      en: "Job Modals & Interaction Polish",
      tr: "İş Modalları ve Etkileşim Rötuşları",
    },
    sections: [
      {
        label: { en: "Modals & Interaction", tr: "Modallar ve Etkileşim" },
        items: {
          en: [
            "Active Job and Completed Job modals now open in a collapsed state by default",
            "Job modals expand only when the user interacts",
            "Prevented all job modals from expanding at the same time",
            "Improved Clock In / Clock Out editing experience",
            "Unified interaction behavior across active and completed job modals",
          ],
          tr: [
            "Aktif İş ve Tamamlanan İş modalları varsayılan olarak küçük / kapalı halde açılır",
            "İş modalları yalnızca kullanıcı etkileşimiyle genişler",
            "Tüm işlerin aynı anda açılması engellendi",
            "Saat Giriş / Saat Çıkış düzenleme deneyimi iyileştirildi",
            "Aktif ve tamamlanan işlerde etkileşim davranışı tekilleştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.5",
    title: {
      en: "Customer Portal (Public) Improvements",
      tr: "Herkese Açık Müşteri Portalı İyileştirmeleri",
    },
    sections: [
      {
        label: { en: "Public Portal", tr: "Genel Müşteri Portalı" },
        items: {
          en: [
            "Public Customer Portal now displays phone number",
            "Public Customer Portal now displays address",
            "Jobs are listed below Payments and Debts for clearer financial flow",
            "Added Print option to public customer page",
            "Public customer page now shows Total Paid",
            "Public customer page now shows Total Owed",
            "Public customer page now shows Net Balance",
            "Improved public page layout and clarity",
          ],
          tr: [
            "Herkese açık Müşteri Portalı artık telefon numarasını gösterir",
            "Herkese açık Müşteri Portalı artık adres bilgisini gösterir",
            "İşler, finansal akışa uygun şekilde Tahsilat ve Borçların altında listelenir",
            "Herkese açık müşteri sayfasına Yazdır seçeneği eklendi",
            "Genel müşteri sayfasında artık Toplam Tahsilat gösterilir",
            "Genel müşteri sayfasında artık Toplam Borç gösterilir",
            "Genel müşteri sayfasında artık Net Bakiye gösterilir",
            "Genel sayfa düzeni ve okunabilirlik iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.4",
    title: {
      en: "Calendar Integration & Admin Controls",
      tr: "Takvim Entegrasyonu ve Admin Kontrolleri",
    },
    sections: [
      {
        label: { en: "Calendar", tr: "Takvim" },
        items: {
          en: [
            "Added full Calendar feature",
            "Calendar views: Daily",
            "Calendar views: Weekly (grouped by day)",
            "Calendar views: Monthly (grouped by day)",
            "Replaced placeholder --:-- with meaningful job status labels",
            "Added Admin toggle to enable / disable calendar visibility",
            "Improved calendar readability and consistency",
          ],
          tr: [
            "Tam kapsamlı Takvim özelliği eklendi",
            "Takvim görünümleri: Günlük",
            "Takvim görünümleri: Haftalık (günlere göre gruplanmış)",
            "Takvim görünümleri: Aylık (günlere göre gruplanmış)",
            "--:-- yerine anlamlı durum etiketleri kullanıldı",
            "Takvim görünürlüğü için Admin aç/kapat seçeneği eklendi",
            "Takvim okunabilirliği ve tutarlılığı iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.3",
    title: {
      en: "Search Bar, Layout & Text Fixes",
      tr: "Arama Çubuğu, Yerleşim ve Metin Düzeltmeleri",
    },
    sections: [
      {
        label: { en: "UI Fixes", tr: "Arayüz Düzeltmeleri" },
        items: {
          en: [
            "Fixed search bar tilting and alignment issues",
            "Centered Total Payment and Total Debt on the home page",
            "Removed Financial Summary label for a cleaner dashboard",
            "Ensured phone number and address display on separate lines in Customer Details",
            "Improved handling of long address text in customer modal",
            "Unified terminology: Clock In / Clock Out labels fully localized",
          ],
          tr: [
            "Arama çubuğunun kayma / eğilme sorunu giderildi",
            "Ana sayfada Toplam Tahsilat ve Toplam Borç ortalandı",
            "Finansal Özet başlığı kaldırılarak daha sade bir görünüm sağlandı",
            "Müşteri Detay ekranında telefon ve adres ayrı satırlarda gösterilir",
            "Uzun adres metinlerinin taşma sorunu giderildi",
            "Saat Giriş / Saat Çıkış ifadeleri tamamen Türkçeleştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.2",
    title: {
      en: "Active & Completed Jobs Final Polish",
      tr: "Aktif ve Tamamlanan İşler Son Rötuş",
    },
    sections: [
      {
        label: { en: "Final UX & Logic", tr: "Son UX ve Mantık" },
        items: {
          en: [
            "Active Jobs now only require Complete Job action",
            "Removed incorrect payment-related actions from Active Jobs",
            "Completed Jobs list now shows only the latest 10 completed jobs",
            "Ensured job states (Active / Completed / Paid) are visually and logically correct",
          ],
          tr: [
            "Aktif İşler artık yalnızca İşi Tamamla aksiyonunu içerir",
            "Aktif İşler’den yanlış ödeme ile ilgili aksiyonlar kaldırıldı",
            "Tamamlanan İşler listesi yalnızca son 10 işi gösterir",
            "İş durumları (Aktif / Tamamlandı / Ödendi) hem görsel hem mantıksal olarak netleştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.1",
    title: {
      en: "Customer Selection, Modals & Desktop Compatibility",
      tr: "Müşteri Seçimi, Modallar ve Masaüstü Uyumluluğu",
    },
    sections: [
      {
        label: { en: "UX & Compatibility", tr: "UX ve Uyumluluk" },
        items: {
          en: [
            "Fixed customer selector not closing when clicking outside",
            "Added search bar inside customer dropdown",
            "Live filtering while typing enabled",
            "Fixed desktop compatibility issues on wide screens",
            "CSS cleaned and reviewed",
            "Improved modal positioning and responsiveness",
          ],
          tr: [
            "Müşteri seçme alanının dışarı tıklanınca kapanmaması sorunu giderildi",
            "Dropdown içine arama çubuğu eklendi",
            "Canlı filtreleme eklendi",
            "Geniş ekranlarda modallerin sağa kayma sorunu giderildi",
            "CSS temizliği ve düzenlemesi yapıldı",
            "Modal konumlandırma ve responsive davranış iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.2.0",
    title: {
      en: "Financial Flow (Recep Logic) & Vault Rules",
      tr: "Finans Akışı (Recep Mantığı) ve Kasa Kuralları",
    },
    sections: [
      {
        label: { en: "Financial Rules", tr: "Finansal Kurallar" },
        items: {
          en: [
            "Money can only enter the system via manual Payment",
            "Job completion alone does not create income",
            "Fixed history showing incorrect colors or missing signs",
            "Vault Active button is available only after opening Vault Details",
            "Improved vault activation workflow clarity",
            "All job and payment flows follow a single financial source of truth",
          ],
          tr: [
            "Sisteme para girişi yalnızca manuel Tahsilat ile olur",
            "İşin tamamlanması tek başına gelir oluşturmaz",
            "Geçmişteki yanlış renk ve işaret sorunları giderildi",
            "Kasa Aktif Yap butonu yalnızca Kasa Detay sayfası içinden erişilebilir",
            "Kasa aktivasyon akışı daha net hale getirildi",
            "Tüm iş ve ödeme akışları tek bir finans kaynağı mantığına bağlandı",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.9",
    title: {
      en: "Job Method Consistency & History Cleanup",
      tr: "İş Yöntemi Tutarlılığı ve Geçmiş Temizliği",
    },
    sections: [
      {
        label: { en: "UX & History", tr: "UX ve Geçmiş" },
        items: {
          en: [
            "Renamed job method label to Çalışma Yöntemi",
            "Fixed history styling issues for minus values",
            "Reorganized Job History modal",
            "Limited Completed Jobs list to last 10 jobs",
            "Active Jobs now focus only on job completion",
          ],
          tr: [
            "İş yöntemi etiketi Çalışma Yöntemi olarak değiştirildi",
            "Geçmiş ekranındaki eksi değer ve stil sorunları düzeltildi",
            "İş Geçmişi modalı düzenlendi",
            "Tamamlanan İşler son 10 kayıt ile sınırlandı",
            "Aktif İşler yalnızca iş tamamlama odaklı hale getirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.8",
    title: {
      en: "Currency Rules, Vault Ownership & Job Flow Fixes",
      tr: "Para Birimi Kuralları, Kasa Sahipliği ve İş Akışı Düzeltmeleri",
    },
    sections: [
      {
        label: { en: "Rules & Consistency", tr: "Kurallar ve Tutarlılık" },
        items: {
          en: [
            "Each user must be linked to a Vault",
            "Each Vault now has its own currency",
            "Currency mismatch warnings added",
            "Active Jobs auto-paid issue fixed",
            "Improved vault–job relationship consistency",
          ],
          tr: [
            "Her kullanıcı bir kasaya bağlı olmak zorundadır",
            "Her kasanın kendine ait para birimi vardır",
            "Para birimi uyumsuzluğunda kullanıcı uyarılır",
            "Aktif işlerin otomatik ödenmiş sayılması sorunu giderildi",
            "Kasa–iş ilişkisi iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.7",
    title: {
      en: "Vault Logic, Pagination & Sticky Navigation",
      tr: "Kasa Mantığı, Sayfalama ve Sabit Navigasyon",
    },
    sections: [
      {
        label: { en: "UX & Performance", tr: "UX ve Performans" },
        items: {
          en: [
            "Fixed Vault delete functionality",
            "Vault active selection moved to Vault Details",
            "Vault selection now uses modal only",
            "Customer pagination added",
            "Bottom navigation and search bar are sticky",
            "Customer list performance improved",
          ],
          tr: [
            "Kasa silme özelliği düzeltildi",
            "Aktif kasa seçimi Kasa Detay sayfasına taşındı",
            "Kasa seçimi yalnızca modal üzerinden yapılır",
            "Müşteri listesine sayfalama eklendi",
            "Alt navigasyon ve arama çubuğu sabit hale getirildi",
            "Müşteri listesi performansı iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.6",
    title: {
      en: "History Order, Printing & Data Integrity",
      tr: "Geçmiş Sıralaması, Yazdırma ve Veri Bütünlüğü",
    },
    sections: [
      {
        label: { en: "Fixes & Safety", tr: "Düzeltmeler ve Güvenlik" },
        items: {
          en: [
            "Added Vault Statement printing",
            "Completed jobs move to end of history",
            "Duplicate customer creation prevented",
            "Completed jobs no longer auto-marked as paid",
            "Active Jobs now include Edit option",
            "Closing a job no longer removes it from customer profile",
          ],
          tr: [
            "Kasa Dökümü yazdırma eklendi",
            "Tamamlanan işler geçmişin sonuna taşınır",
            "Aynı müşterinin tekrar oluşturulması engellendi",
            "Tahsilat sırasında otomatik ödeme işaretleme kaldırıldı",
            "Aktif işlere Düzenle seçeneği eklendi",
            "İş kapatıldığında müşteri profilinden silinmez",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.5",
    title: {
      en: "Job Headers, Layout Symmetry & UX Consistency",
      tr: "İş Başlıkları, Yerleşim Simetrisi ve UX Tutarlılığı",
    },
    sections: [
      {
        label: { en: "UI & Layout", tr: "Arayüz ve Yerleşim" },
        items: {
          en: [
            "Job start and end fields displayed in headers",
            "Helper text added to red warning sections",
            "Duration displayed consistently across job types",
            "Visual hierarchy improved across job forms",
          ],
          tr: [
            "İş başlangıç ve bitiş alanları başlıklarda gösterilir",
            "Kırmızı uyarı alanlarına açıklayıcı metinler eklendi",
            "İş türlerinde süre bilgisi aynı konumda gösterilir",
            "İş formlarında görsel hiyerarşi iyileştirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.4",
    title: {
      en: "Financial Integrity & Universal Totals",
      tr: "Finansal Bütünlük ve Evrensel Toplamlar",
    },
    sections: [
      {
        label: { en: "Financial Integrity", tr: "Finansal Bütünlük" },
        items: {
          en: [
            "Fixed discrepancies between Total Owed, Total Paid, and Total Balance",
            "Ensured all financial summaries use a universal job total calculation",
            "Home page, Customer page, Vault page, and PDFs now always show matching totals",
            "Improved overall financial data integrity across the application",
          ],
          tr: [
            "Toplam Borç, Toplam Tahsilat ve Toplam Bakiye arasındaki uyumsuzluklar giderildi",
            "Tüm finansal özetler artık tek ve evrensel iş toplamı hesaplamasını kullanır",
            "Ana sayfa, müşteri sayfası, kasa sayfası ve PDF çıktılarındaki tutarlar birebir uyumludur",
            "Uygulama genelinde finansal veri bütünlüğü sağlandı",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.3",
    title: {
      en: "Multi-Vault Jobs & Financial Sync Fixes",
      tr: "Çoklu Kasa İşleri ve Finansal Senkron Düzeltmeleri",
    },
    sections: [
      {
        label: { en: "Fixes & Consistency", tr: "Düzeltmeler ve Tutarlılık" },
        items: {
          en: [
            "Improved and confirmed multi-vault job support",
            "Jobs can now be assigned to a selected vault during creation",
            "Fixed job payment completion not reflecting in Customer Details",
            "Resolved stale financial data after deleting jobs, payments, or debts",
            "Ensured deleted payments and debts are fully removed from all calculations",
            "Unified Total Owed, Total Paid, and Net Balance from a single job total source",
          ],
          tr: [
            "Çoklu kasa iş desteği doğrulandı ve iyileştirildi",
            "İş oluştururken ilgili kasa seçimi yapılabilir hale getirildi",
            "Tamamlanan ve ödemesi yapılan işlerin müşteri detayına yansımaması sorunu giderildi",
            "İş, tahsilat veya borç silindikten sonra kalan hatalı finansal veriler düzeltildi",
            "Silinen tahsilat ve borç kayıtları tüm hesaplamalardan tamamen kaldırıldı",
            "Toplam Borç, Toplam Tahsilat ve Net Bakiye tek bir iş toplamı kaynağından hesaplanır",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.2",
    title: {
      en: "Input Fixes, Active Jobs & Visual Consistency",
      tr: "Girdi Düzeltmeleri, Aktif İşler ve Görsel Tutarlılık",
    },
    sections: [
      {
        label: {
          en: "UI & UX Improvements",
          tr: "Arayüz ve UX İyileştirmeleri",
        },
        items: {
          en: [
            "Fixed numeric inputs showing unnecessary trailing zeros",
            "Active Job modal now fully expands when clicking anywhere on the card",
            "Corrected Net Balance color logic (green for positive, red for negative)",
            "Customer selector on Home page no longer auto-selects by default",
            "Removed search bar from the Settings page",
            "Unified spacing and layout across all job time sections",
            "Added explanatory text under Planned Job Duration field",
          ],
          tr: [
            "Bazı sayısal girişlerde görünen gereksiz sıfırlar giderildi",
            "Aktif İşler’de kartın tamamına tıklandığında modal tamamen açılır",
            "Net Durum renk mantığı düzeltildi (pozitif yeşil, negatif kırmızı)",
            "Ana sayfadaki müşteri seçimi artık otomatik atanmaz",
            "Ayarlar sayfasındaki arama çubuğu kaldırıldı",
            "İş zamanı bölümlerinde tüm alanlar için eşit boşluk ve düzen sağlandı",
            "Planlanan iş süresi alanı altına açıklayıcı metin eklendi",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.1",
    title: {
      en: "Portal, PWA & Security Fixes",
      tr: "Portal, PWA ve Güvenlik Düzeltmeleri",
    },
    sections: [
      {
        label: { en: "Fixes & Stability", tr: "Düzeltmeler ve Kararlılık" },
        items: {
          en: [
            "Fixed Customer Portal access (no longer requires admin login)",
            "Public customer links are now globally accessible",
            "Resolved Customer not found errors in shared links",
            "Improved PWA back button behavior",
            "Improved routing stability across the application",
          ],
          tr: [
            "Müşteri Portalı erişim sorunları giderildi (artık admin girişi gerekmez)",
            "Paylaşılan müşteri linkleri herkese açık hale getirildi",
            "Paylaşılan linklerdeki müşteri bulunamadı hatası düzeltildi",
            "PWA geri tuşu davranışı iyileştirildi",
            "Uygulama genelinde yönlendirme kararlılığı artırıldı",
          ],
        },
      },
    ],
  },

  {
    version: "1.1.0",
    title: {
      en: "Navigation, Language & Performance",
      tr: "Navigasyon, Dil ve Performans",
    },
    sections: [
      {
        label: { en: "Improvements", tr: "İyileştirmeler" },
        items: {
          en: [
            "Added English and Turkish language support",
            "Improved menu navigation and active page highlighting",
            "Removed confusing blue header behavior",
            "Home page financial summary now updates based on selected Vault",
            "Moved vault currency selection into Vault Edit page",
            "Enabled code splitting for better performance",
            "Integrated Font Awesome as a font-based icon system",
          ],
          tr: [
            "Türkçe ve İngilizce dil desteği eklendi",
            "Menü navigasyonu ve aktif sayfa vurgulaması iyileştirildi",
            "Kafa karıştıran mavi header davranışı kaldırıldı",
            "Ana sayfa finansal özeti seçilen Kasaya göre güncellenir hale getirildi",
            "Kasa para birimi seçimi Kasa Düzenleme sayfasına taşındı",
            "Daha iyi performans için code splitting uygulandı",
            "Font Awesome font tabanlı ikon sistemi entegre edildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.0.9",
    title: {
      en: "Jobs, Pricing Models & Time Logic",
      tr: "İşler, Fiyatlandırma Modelleri ve Zaman Mantığı",
    },
    sections: [
      {
        label: { en: "New Features", tr: "Yeni Özellikler" },
        items: {
          en: [
            "Added Lunch Break field to Job Creation modal",
            "Added Job Start Date for non-hourly jobs",
            "Introduced three job pricing models (Hourly, Daily, Fixed)",
            "Prevented completed jobs from showing time-tracking options",
            "Improved clarity and flow of job creation process",
          ],
          tr: [
            "İş ekleme modaline Öğle Molası alanı eklendi",
            "Saatlik olmayan işler için İş Başlama Tarihi eklendi",
            "Üç farklı iş fiyatlandırma modeli eklendi (Saatlik, Günlük, Sabit)",
            "Tamamlanan işlerde saat takibi seçenekleri kaldırıldı",
            "İş ekleme süreci daha anlaşılır hale getirildi",
          ],
        },
      },
    ],
  },

  {
    version: "1.0.8",
    title: {
      en: "UI Cleanup, Layout & Accessibility",
      tr: "Arayüz Temizliği, Yerleşim ve Erişilebilirlik",
    },
    sections: [
      {
        label: { en: "UI & UX", tr: "Arayüz ve UX" },
        items: {
          en: [
            "Removed bar chart graphic from the home page",
            "Fixed Net Balance color logic (red shown only when negative)",
            "Wrapped main layout in a container to prevent overly wide screens",
            "Improved spacing and padding across job history, customer history, and summaries",
            "Improved Vault information page design",
            "Customer page now clearly displays balance on the right side",
            "Added direct phone call button to customer profile",
            "Active Job actions now open in a single modal",
          ],
          tr: [
            "Ana sayfadaki bar grafik kaldırıldı",
            "Net Durum renk hatası düzeltildi (yalnızca negatifse kırmızı)",
            "Web görünümü çok geniş olduğu için ana içerik container içine alındı",
            "İş geçmişi, müşteri geçmişi ve finansal özetlerde boşluklar iyileştirildi",
            "Kasa bilgi sayfası görsel olarak düzenlendi",
            "Müşteri sayfasında bakiye sağ tarafta net şekilde gösterilir hale getirildi",
            "Müşteri profiline doğrudan arama (telefon) butonu eklendi",
            "Aktif İşler işlemleri tek bir modal içinde toplandı",
          ],
        },
      },
    ],
  },

  {
    version: "1.0.7",
    title: {
      en: "History, Modals & Safety Improvements",
      tr: "Geçmiş, Modallar ve Güvenlik İyileştirmeleri",
    },
    sections: [
      {
        label: {
          en: "Improvements & Safety",
          tr: "İyileştirmeler ve Güvenlik",
        },
        items: {
          en: [
            "Editing a job inside Customer Details no longer closes the customer detail modal",
            "Job history now shows jobs, payments, and debts in strict chronological order",
            "Added verified delete option for job payments and debt entries",
            "Improved modal interaction stability across customer and job workflows",
          ],
          tr: [
            "Müşteri detay ekranı içinden iş düzenlerken modalın kapanması sorunu giderildi",
            "İş geçmişi artık işler, tahsilatlar ve borçları tarihe göre sıralı şekilde gösterir",
            "İş geçmişinde tahsilat ve borç kayıtları için onaylı silme seçeneği eklendi",
            "Müşteri ve iş akışlarında modal kararlılığı artırıldı",
          ],
        },
      },
    ],
  },

  {
    version: "1.0.6",
    title: {
      en: "Job Creation Flow & Vault Fixes",
      tr: "İş Oluşturma Akışı ve Kasa Düzeltmeleri",
    },
    sections: [
      {
        label: { en: "Fixes & Workflow", tr: "Düzeltmeler ve İş Akışı" },
        items: {
          en: [
            "Creating a job from the customer profile now auto-selects the customer",
            "Creating a job from the home page allows manual customer selection",
            "Fixed inability to rename vaults",
            "Prevented vault selection button from automatically opening vault detail modal",
            "Fixed issue where clicking Payment did not open its modal",
            "Improved admin page stability and resolved rendering issues",
          ],
          tr: [
            "Müşteri profilinden iş oluşturulduğunda müşteri otomatik olarak seçilir",
            "Ana sayfadan iş oluştururken müşteri manuel olarak seçilebilir",
            "Kasa adının değiştirilememesi sorunu giderildi",
            "Kasa seçme butonunun detay modalını otomatik açması engellendi",
            "Tahsilat butonuna basıldığında modalın açılmaması sorunu düzeltildi",
            "Yönetici (Admin) sayfası hataları giderildi ve kararlılığı artırıldı",
          ],
        },
      },
    ],
  },

  {
    version: "1.0.5",
    title: {
      en: "UI Fixes & Job / Parts Corrections",
      tr: "Arayüz Düzeltmeleri ve İş / Parça Hesaplamaları",
    },
    sections: [
      {
        label: { en: "Fixes", tr: "Düzeltmeler" },
        items: {
          en: [
            "Fixed incorrect button logic between Completed Jobs and Add Debt",
            "Parts now correctly affect job total (quantity × unit price)",
            "Clarified parts input fields to avoid confusion",
            "Limited Completed Jobs list to a maximum of 10 items",
            "Completed Jobs now show only jobs completed today and not yet paid",
            "Improved customer search with clear (✕) button",
            "Fixed modal stacking issue when adding customers",
          ],
          tr: [
            "Tamamlanan İşler ve Borç Ekle buton mantığı düzeltildi",
            "Parçalar artık iş toplamına doğru şekilde eklenir (adet × birim fiyat)",
            "Parça giriş alanları daha anlaşılır hale getirildi",
            "Tamamlanan İşler listesi maksimum 10 kayıt ile sınırlandı",
            "Tamamlanan İşler yalnızca bugün tamamlanan ve ödenmemiş işleri gösterir",
            "Arama kutusuna temizleme (✕) butonu eklendi",
            "Müşteri eklerken oluşan modal üst üste binme sorunu giderildi",
          ],
        },
      },
    ],
  },

  {
    version: "0.9.6",
    title: {
      en: "Customer Portal, PDF & Printing",
      tr: "Müşteri Portalı, PDF ve Yazdırma",
    },
    sections: [
      {
        label: { en: "New Features", tr: "Yeni Özellikler" },
        items: {
          en: [
            "Added Customer Portal link for public transaction viewing",
            "PDF preview now opens inside a modal",
            "Added Print and Download PDF options",
            "Added sharing options via Email and WhatsApp",
            "Print view now includes all transaction details clearly",
          ],
          tr: [
            "Herkese açık işlem görüntüleme için Müşteri Portalı eklendi",
            "PDF önizleme artık modal içinde açılır",
            "Yazdır ve PDF İndir seçenekleri eklendi",
            "E-posta ve WhatsApp ile paylaşım seçenekleri eklendi",
            "Yazdırma görünümü tüm işlem detaylarını net şekilde gösterir",
          ],
        },
      },
    ],
  },

  {
    version: "0.9.4",
    title: {
      en: "Jobs, Time Tracking & History",
      tr: "İşler, Zaman Takibi ve Geçmiş",
    },
    sections: [
      {
        label: { en: "Changes", tr: "Değişiklikler" },
        items: {
          en: [
            "Added Clock In / Clock Out time tracking",
            "Manual job entries now calculate due dates correctly",
            "Prevented new jobs from auto-selecting the most recent customer",
            "Job and payment history can be filtered by date range",
            "Clicking history items now opens a modal",
            "Main screen now shows the last 5 transactions",
          ],
          tr: [
            "Saat Giriş / Saat Çıkış sistemi eklendi",
            "Manuel iş girişlerinde vade tarihi doğru şekilde hesaplanır",
            "Yeni iş eklerken son müşterinin otomatik seçilmesi engellendi",
            "İş ve ödeme geçmişi tarih aralığına göre filtrelenebilir",
            "Geçmiş kayıtlar artık modal içinde açılır",
            "Ana ekranda son 5 işlem görüntülenir",
          ],
        },
      },
    ],
  },

  {
    version: "0.9.2",
    title: {
      en: "Payments, Vaults & Accounting Logic",
      tr: "Tahsilat, Kasalar ve Muhasebe Mantığı",
    },
    sections: [
      {
        label: { en: "Improvements", tr: "İyileştirmeler" },
        items: {
          en: [
            "Added multi-currency support",
            "Introduced multiple Vaults per user",
            "Vaults can represent different physical locations",
            "Payments now require selecting Vault and Payment Method",
            "Payment method and vault name added to history and PDFs",
            "Implemented clear plus / minus logic for payments and debts",
            "Customer balance can go negative and prints correctly in PDFs",
            "Mandatory notes added for payments and debts",
          ],
          tr: [
            "Çoklu para birimi desteği eklendi",
            "Kullanıcılar için çoklu kasa sistemi eklendi",
            "Kasalar farklı fiziksel lokasyonları temsil edebilir",
            "Ödeme sırasında kasa ve ödeme yöntemi seçimi zorunlu hale getirildi",
            "Kasa adı ve ödeme yöntemi geçmişte ve PDF’lerde gösterilir",
            "Tahsilat (+) ve borç (−) mantığı netleştirildi",
            "Negatif bakiye desteği ve doğru PDF gösterimi eklendi",
            "Tahsilat ve borç işlemleri için açıklama zorunlu yapıldı",
          ],
        },
      },
    ],
  },

  {
    version: "0.9.0",
    title: {
      en: "Core Architecture & UI Refactor",
      tr: "Çekirdek Mimari ve Arayüz Yenilemesi",
    },
    sections: [
      {
        label: { en: "Refactor", tr: "Yeniden Yapılandırma" },
        items: {
          en: [
            "Refactored project structure (Jobs & Customers separated into folders)",
            "Moved all CSS into dedicated stylesheet files",
            "Adopted new, cleaner UI design",
            "Improved overall layout consistency and readability",
          ],
          tr: [
            "Proje yapısı yeniden düzenlendi (İşler ve Müşteriler klasörlere ayrıldı)",
            "Tüm CSS kodları ayrı dosyalara taşındı",
            "Daha temiz ve modern bir arayüz tasarımı benimsendi",
            "Genel görünüm ve okunabilirlik iyileştirildi",
          ],
        },
      },
    ],
  },
];
