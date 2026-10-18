# Tez çalışma protokolü — v2

Bu metin araştırmacı önerisini, ders notlarındaki dayanaklardan ayırır. Danışmanın kesin talebi olduğu söylenmeyen tasarım kararları onay bekler. Uygulamadaki Model ve yöntemler ekranı aynı ayrımı gösterir.

## 1. Amaç ve kapsam

Deterministik, tek ürünlü, sonlu ufuklu, kapasitesiz parti büyüklüğü. Tedarik gecikmesizdir. Başlangıç ve bitiş net stoku sıfırdır. Talep dönemler arasında değişir, fakat çözüme başlandığında bütün dönem talepleri bilinir. Rassal problem üretimi stokastik karar modeli değildir.

Model 1: talep kendi döneminden geç karşılanamaz. Model 2: talep sonraki dönemde karşılanabilir ve dönem sonu bekleyen miktara gecikme maliyeti ödenir. Kayıp satış yoktur. Bu yorum notların PDF s. 243–245 ve 258–260 bölümüne dayanır. Çok ürün, kapasite, belirsiz talep ve lost sales kapsam dışındadır.

## 2. Semboller, birimler ve maliyet

D_t talep (adet), Q_t üretim/teslim (adet), A_t hazırlık (TL/pozitif üretim dönemi), h_t stok ve b_t gecikme maliyetleri (TL/adet-dönem), c dönemler boyunca sabit birim üretim maliyeti (TL/adet). N_t net stok, I_t=max(N_t,0), B_t=max(-N_t,0). Hazırlık göstergesi y_t ikilidir.

N_t=N_(t−1)+Q_t−D_t; N_0=N_T=0; Q_t≥0. Yok satmasız modelde N_t≥0. Q_t≤M y_t, M=ΣD_t. M bir kapasite kısıtı değil, hazırlık kararını üretimle ilişkilendiren üst sınırdır.

Karar maliyeti C=Σ(A_t y_t+h_t I_t+b_t B_t). Üretim dahil toplam C+cΣD_t. Ana yüzde sapma g=100(C−C*)/C*. Sabit ortak maliyet sıralamayı değiştirmez, fakat paydaya eklenirse yüzde sapmayı değiştirir; bu nedenle iki tutar açıkça ayrılır. Sıfır optimum ve sıfır maliyet %0; sıfır optimuma karşı pozitif maliyetin sapması tanımsızdır, mutlak maliyet korunur ve hata sayılır.

İlk sürüm c_t değişimine izin vermez. Notlardaki dönemlik c_t içeren örnekler, bu sadeleştirme altında aynen çözüldüğü iddia edilen örnekler değildir. Dönemlik c_t zorunlu tutulursa çözücüler ve sezgisel maliyet kuralları birlikte genişletilmelidir.

## 3. Ders yöntemleri ve uzantılar

Notlardaki kaynaklar: PDF s. 370 ve 380–386 (L4L, SM, LUC, LTC, PPB), 243–260 ve 867–876 (kesin DP). LTC stok maliyeti hazırlığı aşmadan önce durur; PPB hazırlığa en yakın maliyeti seçer ve eşitlikte daha uzun partiyi alır. Kitapta LTC=470, PPB=430, WW=430 örneği regresyon testidir.

Yok satmasız referans Wagner–Whitin; yok satmalı referans Zangwill türü aralık DP'dir. Klasik yok satmasız kurallar, yok satmalı deneyde yalnız aynı planları koruyan temel karşılaştırmalardır. Ek TB ve SA6, iki modelin kurallarına göre uygulanır. ESK, TB'nin en fazla sekiz iyileştiren hamleyle geliştirilmesidir. SA6 kısıtlı çözüm uzayında kesindir; özgün problem için sezgiseldir. Bu uzantılar için bilimsel yenilik iddiası yapılmaz.

## 4. Kontrollü deney

3 ufuk: T∈{8,24,48}. 2 değişkenlik: CV∈{0,2;1}. 5 hazırlık ölçeği: rho∈{0,5;1;2;4;8}. Her ana koşulda 10 bağımsız problem: 30×10=300 temel veri seti. Her veri seti iki modelde çözülür; 600 model durumu 600 bağımsız temel problem değildir.

D_t, gamma dağılımından üretilip tamsayıya yuvarlanır. Ortalama hedefi mu=100; şekil k=1/CV², ölçek theta=mu CV². Böylece yuvarlama öncesi ortalama mu, CV hedefidir. Gerçekleşen ortalama ve popülasyon biçiminde örnek CV ayrıca saklanır. Tamamen sıfır üretilen ufukta ilk talep 100'e ayarlanır; bu açık bir üreteç kuralıdır. Sıfır talepli uç örnekler ayrıca doğruluk testlerinde bulunur. h=1, A=rho*h*mu.

b/h∈{0,25;1;4} ana koşul ve tekrar indeksine göre döndürülür. Her ana koşulda 4/3/3 gözlem, hangi seviyenin 4 olduğu koşullar arasında dönüşümlüdür; toplamda 100/100/100. Bu, dördüncü tam faktör değildir. Tohum ve ham girdiler saklanır. Kontrol parametreleri sentetik zorluk koşullarıdır; gerçek talep dağılımı iddiası yoktur. Varsayılan tohum 20261018; yeni tohumlar ayrı deney olarak raporlanır, birleştirilip aynı 300 problem gibi sunulmaz.

## 5. İstatistiksel sorular

Her modelde önceden tanımlı çiftler TB−SA6, ESK−TB, ESK−SA6. Delta_i=g_(i,A)−g_(i,B), birim yüzde puan. Negatif fark ilk yöntem lehine. H0: tasarımın hedef karışımında E[delta]=0; H1: farklı. İki modelde altı ana karşılaştırma bir Holm ailesidir. Algoritma seçimi veya görünüm filtresi aileyi değiştirmez. ESK−TB için yapısal olarak kötüleşmeme özelliği vardır; çok sayıda sıfır ve tek yönlü fark nedeniyle standart t'nin varsayımları özellikle dikkatle yorumlanır.

Sıradan eşleştirilmiş t: t=mean(delta)/(s_delta/sqrt(n)), sd=n−1. Çıktı karşılaştırma ve ders gereksinimi için saklanır; farklı sabit koşulları tek dağılım gibi ele aldığı için tek başına doğrulayıcı sonuç sayılmaz.

Ana çıkarım tabakası: (T,CV,rho,b/h); 30 ana koşulun 90 alt tabakası. Tabaka h'de geçerli çift sayısı n_h, w_h=n_h/n, fark ortalaması dbar_h, örnek varyansı s_h². Tahmin D=Σw_h dbar_h, v_h=w_h² s_h²/n_h, SE=sqrt(Σv_h). Yaklaşık sd=(Σv_h)²/Σ[v_h²/(n_h−1)]. Yaklaşık tabakalı t=D/SE. Her tabakada en az iki geçerli eşleşme yoksa hesaplanmaz. Sıfır varyansta t/p üretilmez. Satterthwaite yaklaşımı tam dağılım kanıtı değildir; özellikle küçük alt tabakalarda normal yaklaşım ve sonlu varyans duyarlılığı belirtilir.

Fark çiftleri aynı tabaka içinde birlikte yeniden örneklenir; bootstrap 2000 tekrar, yüzdelik %95 aralık. Başarı tablosunun ortalama sapma aralığı 1000 tekrar aynı tabakalaştırmayla üretilir. Aralıklar tekil %95'tir; eşzamanlı güven aralığı değildir. Ana Holm düzeltmesi t-p değerlerine uygulanır; bootstrap aralıkları duyarlılık kontrolüdür. Eksik çiftler sayılır; bu durumda bulgular geçerli çiftlere koşulludur ve başarısız yöntemlerin genel üstünlüğü iddia edilemez.

Çarpıklık, aşırı basıklık, IQR uç değer sayısı ve histogram/Q–Q grafiği gösterilir. Bunlar normallik kanıtı veya otomatik test seçme kuralı değildir. Karışım Q–Q grafiği tabaka içi normalliği kanıtlamaz. Uç değerler yalnız büyük oldukları için çıkarılmaz. Wilcoxon simetri varsaydığı için otomatik alternatif olarak kullanılmaz. Bağlar çıkarılarak iki yönlü binom işaret testi ayrıca verilir; bu test kazanma yönünü sınar, ortalama fark hipotezini değil. İşaret testi için ayrı ikincil altılı Holm ailesi vardır. p≥0,05 eşitlik, eşdeğerlik veya optimumluk kanıtı değildir.

Önerilen pratik eşik |ortalama fark|=0,5 yüzde puandır; hocanın talebi değildir. Eşik aşımı tek başına yöntemi seçtirmez; süre ve kuyruk performansı da yorumlanır. d_z sıradan eşleştirilmiş farkın standartlaştırılmış betimsel etkisidir; karma tasarım için evrensel etki diye sunulmaz.

## 6. Süre ve raporlama

Her yöntem aynı veriyi kullanır. Isınma ve 1 ms hedefli grup kalibrasyonu, en fazla 256 çözüm/grup; grup süresi çözüm sayısına bölünür. Varsayılan beş tekrarın medyanı problem süresidir. Tekrarlar bağımsız deney sayılmaz. Yöntem sırası Fisher–Yates ile tohumlu karıştırılır. Yöntemin ön hesabı dahildir; rapor, referansın dışarıdan hesaplanması ve denetim hariçtir. OS yükü, JIT/GC ve zamanlayıcı çözünürlüğü sınırlılıkları belirtilir.

Süre oranı exp(mean(log(t_A/t_B))) betimseldir; 1'den küçük değer ilk yöntemin daha hızlı olduğunu gösterir. Pozitif olmayan süreler oran hesabından çıkarılır. Zamanlama için hesaplanan sıradan log-fark t değeri ham JSON'da yalnız ikincil/keşifsel kayıttır; ana kalite test ailesine dahil edilmiş bir hız anlamlılığı iddiası yoktur.

Her yöntemde karar maliyeti, üretim dahil toplam, ortalama/medyan/P95/en kötü yüzde sapma, örnek standart sapma, optimum oranı, hata sayısı, medyan/P95 süre gösterilir. Optimum eşitliği toleransı 1e−7×max(1,C*)'dır. Küçük yuvarlama sapmaları 1e−9 göreli toleransla sıfır kabul edilir. Plan dengesi toleransı talep toplamıyla ölçeklenen 64 makine epsilonudur; gerçek küçük talepler sabit 1e−7 ile sıfırlanmaz.

## 7. Doğrulama ve veri bütünlüğü

Ders örnekleri ve 160 küçük problemin bağımsız üretim enumerasyonu. Ek olarak SciPy/HiGHS ile her talebi bir açık üretim dönemine atayan MILP: y_p∈{0,1}, z_pt∈[0,1], Σ_p z_pt=1, z_pt≤y_p. Yok satmasız p>t atamaları yasak; birim taşıma maliyeti ilgili h veya b dönemlerinin açık toplamıdır. Amaç ΣA_p y_p + ΣD_t taşıma_(p,t) z_pt. Bu formülasyon JS aralık DP'sini kullanmaz. Yalnız status=0 ve tolerans içinde aynı amaç değeri varsa onaylanır; alt sınır ve MIP gap kaydedilir.

SciPy'nin bağımsız t/t-kuyruğu/CI fikstürleri JS özel fonksiyonlarını sınar. Gerçek deneyin sıradan t, tabakalı t ve işaret testi sonuçları Python tarafında yeniden hesaplanır. `validation.json` ilgili girdi SHA-256'sını ve gerçek kontrol sayılarını taşır. Dosya olmadan harici kontrol yapılmış sayılmaz.

JSON geri yüklemede model/tasarım sürümü, tam yöntem-problem kapsamı, üreteç/tohumla girdi uyumu, denge/maliyet ve deterministik yöntem planı denetlenir. Optimum, sapma, özetler ve testler yeniden hesaplanır. İçe aktarılan süreler yeniden ölçülmez; kaynak dosyadaki ölçüm olarak korunur. SHA-256 parmak izi bütünlük karşılaştırmasıdır, dijital imza veya kaynak doğrulaması değildir.

## 8. Açık kapsam kararları

Hocayla 300 sayısının yorumu, zorunlu yöntem/test çiftleri, dönemlik c_t ihtiyacı, istatistiksel ve pratik eşikler teyit edilmelidir. Mevcut sürüm tez çalışmasına yönelik tekrarlanabilir bir araçtır; danışman onayı, bilimsel özgünlük veya işletme ortamına geçerlilik belgesi değildir.

## Kaynaklar

- Ekli Prof. Dr. Yakup Kara ders notları, yukarıda belirtilen PDF sayfaları.
- [NIST: paired comparisons](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm).
- [R: Holm ve diğer p düzeltmeleri](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html).
- [R: Wilcoxon varsayımları](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/wilcox.test.html).
- [SciPy: eşleştirilmiş t](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html).
- [SciPy: MILP ve durum kodları](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html).
- [NumPy: gamma parametreleri](https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.gamma.html).
- [Zangwill: backlogging ağ ve DP yaklaşımı](https://pubsonline.informs.org/doi/10.1287/mnsc.15.9.506).
