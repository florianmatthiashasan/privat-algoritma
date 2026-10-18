# Parti • Tez — parti büyüklüğü karşılaştırması

Türkçe, tek ürünlü ve kapasitesiz lot büyüklüğü çalışma alanı. Tek problemde karar mantığını açıklar; kontrollü 300 temel veri setini yok satmasız ve ertelenmiş talepli modellerde karşılaştırır. Çözüm sırasında bütün talepler bilinir. Kayıp satış ve stokastik karar modeli yoktur.

## Çalıştırma

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm test
npm run build
npm run benchmark
```

Uygulama `http://127.0.0.1:5173` adresinde açılır. Gezinme URL hash'ine yansır; sayfa yenileme ve tarayıcı geri/ileri işlevleri çalışır. Sunucu veya harici veri tabanı gerekmez. Ürünlerin ayrı problem verileri ve senaryolar localStorage'da; deneyler IndexedDB'de saklanır. Tarayıcı verilerini silmek kayıtları kaldırır; JSON yedeği indirin. Eski aktif problem/senaryo kayıtları uyarlanır; eski deney sürümleri tez sürümüne karıştırılmaz.

## Ekranlar

- **Planlama:** 1–120 dönem, talep/hazırlık/stok/gecikme maliyetleri ve dönemler boyunca sabit birim üretim maliyeti. Canlı çözüm; ayrı stok/bekleyen talep sütunları; talep–üretim ve net stok grafikleri; gerçek çözücü izinden adaylar ve seçim gerekçesi. Takvim döneminde gezinmek çözümü değiştirmez. Küçük örnek ve kitap örneği hazırdır. Dönem silme geri alınabilir.
- **Veri yönetimi:** CSV/JSON içe aktarma, şablon, problem yedeği; senaryo kaydetme, adlandırma, yükleme, onaylı silme. CSV `demand,setup,holding,backlog` veya Türkçe `talep,hazırlık,stok,gecikme` başlıklarını kabul eder. Noktalı virgüllü dosyada ondalık virgül kullanılabilir. CSV'de gecikme sütunu yoksa 10, model yok satmasız, c=0 varsayılır; ekranda açıklanır. JSON model ve c'yi korur.
- **Ürünler:** Her kayıt bağımsız bir tek ürün problemidir. Ürün değiştirmek kendi verisini/modelini geri getirir. Ortak kapasiteli çok ürün modeli değildir.
- **Deney laboratuvarı:** Tam tasarım 300 temel problem / 600 model durumu / 5.400 yöntem sonucu. Worker, ilerleme ve durdurma; CV/ufuk/hazırlık oranı filtreleri; maliyet/sapma/süre tabloları, histogram, hız–kalite grafiği; altı önceden tanımlanmış eşleştirilmiş karşılaştırma ve fark/Q–Q grafikleri. Deneyler geçmişe kaydedilir ve yenilemeden sonra açılır. İçe aktarma sürümü, tohumu, dengeyi ve yöntem planını denetler; türetilmiş istatistikleri yeniden hesaplar. İçe aktarılan süreler dosyadaki ölçümlerdir, yeniden ölçülmez.
- **Raporlar:** Aktif planların JSON çıktısı, son deneyin açıklamalı Markdown raporu, yazdır/PDF kaydet. Bütün grafik ve istatistikler ayrıca laboratuvarda yazdırılabilir.
- **Model ve yöntemler:** Semboller, formüller, ders sayfaları, varsayımlar, araştırmacı önerileri ve hocayla teyit edilecek konular.

## Model ve maliyet tanımı

`N[t] = N[t-1] + Q[t] - D[t]`; başlangıç ve bitiş net stoku sıfır. Yok satma yasakken `N[t]>=0`; izin verilince negatif net stok sonraki dönemde karşılanan taleptir. Fiziksel stok `max(N,0)`, bekleyen talep `max(-N,0)`.

`C = Σ A[t]·1(Q[t]>0) + h[t]·max(N[t],0) + b[t]·max(-N[t],0)` karar maliyetidir. Sabit birim üretim maliyeti `c` için üretim dahil toplam `C+cΣD[t]` ayrıca gösterilir. **Yüzde sapma C üzerinden hesaplanır**; ortak sabit üretim maliyeti paydaya sessizce eklenmez. API'de `plan.total` karar maliyeti, `plan.grandTotal` üretim dahil toplamdır. Dönemlik değişken c_t bu sürümde desteklenmez.

İlgili ders dayanakları: ekli Prof. Dr. Yakup Kara notlarında PDF s. 243–260, 370, 380–386, 867–876. Tüm 942 sayfanın incelendiği iddia edilmez. Sabit c ve 300 temel problemin iki modelde kullanılması ilk sürüm önerisidir; hocayla teyit edilmelidir.

## Yöntemler ve önemli düzeltme

- Yok satmasız kesin referans **Wagner–Whitin**; yok satmalı referans **Zangwill türü aralık DP**. Aynı maliyet ve sınır koşulları kullanılır. Zaman sırasıyla O(T²)/O(T³), bellek O(T²).
- Ders yöntemleri: L4L, Silver–Meal, LUC, LTC, PPB. SM/LUC ilk ortalama maliyet artışında durur. **LTC stok maliyeti hazırlığı aşmadan önceki partiyi; PPB hazırlığa en yakın stok maliyetini seçer.** PPB eşitlikte daha uzun partiyi seçer. Kitap örneği: LTC 470, PPB 430, WW 430. Eski prototip LTC'yi PPB ile aynı kurala bağlamıştı; eski sonuçlar `experiments/archive-v1` altında açıkça arşivlenmiştir.
- **Tasarruflu birleştirme (TB):** En büyük pozitif komşu parti tasarrufunu seçer; aralık maliyetleri önbelleğe alınır. Her iki modeli destekler.
- **Ekle–sil–kaydır (ESK):** TB planına en fazla sekiz iyileştiren ekleme/silme/komşuya kaydırma hamlesi uygular. Optimum referansını kullanmaz ve başlangıç planından pahalı olamaz.
- **Sınırlı aralık araması (SA6):** En fazla altı takvim dönemlik partiler altında en iyi aralık planını arar. Özgün problem için küresel optimum garantisi yoktur.

Ek yöntemler proje uzantısıdır; yeni bilimsel yöntem iddiası yoktur. Klasikler yok satmalı deneyde yok satmasız **temel plan** olarak etiketlenir; gecikmeye uyarlanmış yöntem oldukları iddia edilmez. Kesin DP bu boyutlarda daha hızlı olabilir; sezgisel hız üstünlüğü varsayılmaz.

## Deney, istatistik ve tekrar üretme

Ayrıntılı matematiksel protokol: [THESIS_PROTOCOL.md](THESIS_PROTOCOL.md).

Ana tasarım: 3 ufuk (8/24/48) × 2 hedef CV (0,2/1) × 5 hazırlık oranı (0,5/1/2/4/8) × 10 bağımsız tekrar = 300. Ortalama talep 100, h=1; gamma talepler tamsayıya yuvarlanır. `A=rho*h*100`. `b/h=0,25/1/4` her ana koşulda dönüşümlü atanır; 300 problemde 100'er örnek vardır. Dördüncü tam faktör değildir. Ana koşul ve b/h alt seviyeleri çıkarımda birlikte tabakalanır; tam deneyde 90 tabaka vardır. Tohum varsayılan 20261018. Bu dağılım ve aralıklar araştırmacı önerisidir, gerçek işletme verisine uydurulmuş değildir.

Üç yöntem çifti (TB−SA6, ESK−TB, ESK−SA6), iki modelde toplam altı doğrulayıcı karşılaştırmadır. H0 ortalama sapma farkı sıfır; H1 farklı. Sıradan eşleştirilmiş t, tabakalı ortalama fark t yaklaşımı/Satterthwaite sd, Holm p, tekil güven aralıkları, tabakalı eşleştirilmiş bootstrap ve fark diagnostikleri birlikte verilir. Arayüz filtreleri bu test ailesini değiştirmez. İşaret testi farklı bir soruyu, kazanma yönünü sınar. Varsayım uyarıları ve p≥0,05'in eşitlik kanıtı olmadığı açıklaması çıktılara taşınır.

```sh
npm run benchmark -- --input experiments/problems.json --output /tmp/tez-tekrar
npm run benchmark -- --seed 20261019 --count 300 --repetitions 5 --output /tmp/tez-yeni-tohum
uv run --with scipy==1.18.1 python scripts/validate_thesis.py
```

Python/SciPy sadece bağımsız doğrulama içindir; web uygulamasının çalışma bağımlılığı değildir. `scipy==1.18.1` bağımsız test ortamını tekrar kurar. SciPy referans fikstürlerini yeniden üretmek için aynı komuta `--fixtures` eklenebilir.

## Çıktılar ve doğrulama

- [Deney raporu](experiments/REPORT.md): maliyet, sapma, süre, istatistik ve sınırlılıklar.
- [Girdiler](experiments/problems.json): 300 problem, faktörler, gerçekleşen talep istatistikleri ve tohum.
- [Tam deney](experiments/results.json): planlar, ham sonuçlar, protokol, sürümler ve SHA-256 girdi parmak izi.
- [Ham CSV](experiments/results.csv), [özet ve testler](experiments/summary.json), [istatistik CSV](experiments/statistics.csv).
- [Bağımsız doğrulama](experiments/validation.json): ilgili girdi parmak izine karşı SciPy/HiGHS kontrolünün gerçek sonucu.

`npm test`: ders örnekleri, 160 küçük problemin iki modda bağımsız üretim enumerasyonu, bütün 300 problemin plan/maliyet denetimi, sıfır ve çok küçük talep, sabit c, trace-plan eşitliği, veri içe aktarma, sürüm/tohum kontrolü ve bağımsız SciPy istatistik fikstürleri. Harici doğrulamada üretim dönemlerini açan ikili değişkenler ve talep atama değişkenleriyle ayrı bir MILP kurulur; optimum durum kodu olmadan referans onaylanmaz. Sıradan t, tabakalı t ve işaret testi SciPy ile uzlaştırılır.

Tam doğrulama akademik özgünlük, danışman onayı veya gerçek işletmelere genellenebilirlik iddiası değildir. Tarayıcı ve Node zamanları farklı ortamlardır. Modelin sınırları ve bekleyen kapsam kararları raporun parçasıdır.
