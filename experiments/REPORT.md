# Parti büyüklüğü: tez deneyi

Model: thesis-v2.0.0; tasarım: balanced-factorial-v2; istatistik: paired-stratified-v1.0.0.

300 temel problem × iki model; 5400 yöntem sonucu. Tohum 20261018; süre tekrarı 5; sabit c=0. Geçerlilik hatası: 0. Oluşturma: 2026-10-18T18:13:18.198Z.

Girdi SHA-256: 15fed892c2585742d6776b3ec2015e6800791f4c9dd0cb719e66b5a5dd945549.

## Model ve maliyet tanımı

Tek ürün; dönem talepleri önceden bilinir (deterministik); kapasite kısıtı yoktur; tedarik süresi sıfırdır; başlangıç ve bitiş net stoku sıfırdır; kayıp satış yoktur.

Yüzde sapma; hazırlık, stok ve yok satma maliyetlerinden oluşan karar maliyeti üzerinden hesaplanır. Sabit birim üretim maliyeti ayrıca raporlanır ve sapmanın paydasına eklenmez.

Denge: N_t=N_(t−1)+Q_t−D_t; N_0=N_T=0. Karar maliyeti: Σ[A_t·1(Q_t>0)+h_t max(N_t,0)+b_t max(−N_t,0)]. Üretim dahil toplam: C+cΣD_t. Sapma: 100(C−C*)/C*. Sıfır optimumda sıfır maliyet %0; pozitif maliyetin yüzde sapması tanımsızdır ve hata sayılır.

## Deney tasarımı

3 ufuk × 2 hedef CV × 5 hazırlık oranı × 10 tekrar = 300 temel problem. Talepler ortalaması 100 olan gamma dağılımından üretilir; h = 1. b/h = 0,25 / 1 / 4 düzeyleri dönüşümlü atanır; her düzeyde 100 problem bulunur.

Bu çalışma 30 hücrenin her birinde 10 bağımsız problem içerir. Gamma talepler tamsayıya yuvarlanır; hedef CV 0,2 / 1’dir, gerçekleşen CV ve ortalama girdilerle birlikte saklanır. Rassallık yalnızca problem üretimindedir; çözüm sırasında bütün talepler bilinir.

## Yok satmasız model

Kesin referans: Wagner–Whitin.

| Yöntem | Ortalama karar maliyeti | Ortalama toplam (üretim dahil) | Ortalama sapma % [tekil GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | n / hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 4223,13 | 4223,13 | 0,000 [0,000; 0,000] | 0,000 | 0,000 | 0,000 | 100,0 | 0,0256 | 0,0880 | 300 / 0 |
| Sınırlı aralık araması | 4235,64 | 4235,64 | 0,129 [0,087; 0,179] | 0,000 | 0,724 | 5,549 | 93,7 | 0,0227 | 0,0721 | 300 / 0 |
| Ekle–sil–kaydır | 4237,75 | 4237,75 | 0,247 [0,192; 0,310] | 0,000 | 1,534 | 5,093 | 75,3 | 0,2222 | 2,0943 | 300 / 0 |
| Tasarruflu birleştirme | 4276,45 | 4276,45 | 0,883 [0,742; 1,036] | 0,000 | 3,852 | 14,783 | 58,7 | 0,0242 | 0,0794 | 300 / 0 |
| Silver-Meal | 4318,23 | 4318,23 | 1,696 [1,494; 1,900] | 0,860 | 6,534 | 14,938 | 37,3 | 0,0050 | 0,0107 | 300 / 0 |
| Least Total Cost | 4343,68 | 4343,68 | 2,318 [2,071; 2,562] | 0,928 | 9,414 | 17,792 | 37,0 | 0,0049 | 0,0104 | 300 / 0 |
| Part-Period Balancing | 4606,73 | 4606,73 | 10,722 [10,031; 11,426] | 7,858 | 27,251 | 60,631 | 7,3 | 0,0049 | 0,0101 | 300 / 0 |
| Least Unit Cost | 4938,35 | 4938,35 | 22,492 [20,358; 25,034] | 7,682 | 70,671 | 325,342 | 21,7 | 0,0050 | 0,0107 | 300 / 0 |
| Lot-for-Lot | 8242,67 | 8242,67 | 64,746 [63,535; 65,876] | 49,168 | 166,325 | 217,933 | 10,0 | 0,0026 | 0,0052 | 300 / 0 |

## Yok satmalı model (ertelenmiş talep)

Kesin referans: Zangwill aralık DP.

| Yöntem | Ortalama karar maliyeti | Ortalama toplam (üretim dahil) | Ortalama sapma % [tekil GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | n / hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 3402,96 | 3402,96 | 0,000 [0,000; 0,000] | 0,000 | 0,000 | 0,000 | 100,0 | 0,0337 | 0,1545 | 300 / 0 |
| Ekle–sil–kaydır | 3416,25 | 3416,25 | 0,308 [0,251; 0,370] | 0,000 | 1,810 | 5,105 | 72,0 | 0,2964 | 3,1617 | 300 / 0 |
| Tasarruflu birleştirme | 3461,77 | 3461,77 | 1,240 [1,106; 1,391] | 0,474 | 4,719 | 12,378 | 43,7 | 0,0258 | 0,0849 | 300 / 0 |
| Sınırlı aralık araması | 3465,71 | 3465,71 | 2,095 [1,859; 2,362] | 0,000 | 15,434 | 49,635 | 78,0 | 0,0251 | 0,0779 | 300 / 0 |
| Silver-Meal | 4318,23 | 4318,23 | 29,074 [28,598; 29,581] | 14,792 | 92,895 | 105,767 | 14,0 | 0,0059 | 0,0122 | 300 / 0 |
| Least Total Cost | 4343,68 | 4343,68 | 29,920 [29,288; 30,571] | 15,592 | 94,502 | 132,301 | 14,7 | 0,0057 | 0,0121 | 300 / 0 |
| Part-Period Balancing | 4606,73 | 4606,73 | 39,967 [38,895; 40,995] | 25,490 | 104,986 | 130,205 | 1,7 | 0,0057 | 0,0119 | 300 / 0 |
| Least Unit Cost | 4938,35 | 4938,35 | 54,608 [52,279; 57,327] | 42,117 | 150,165 | 325,342 | 10,0 | 0,0059 | 0,0124 | 300 / 0 |
| Lot-for-Lot | 8242,67 | 8242,67 | 113,586 [111,691; 115,453] | 78,356 | 351,885 | 495,118 | 6,7 | 0,0034 | 0,0068 | 300 / 0 |

## Eşleştirilmiş istatistik

Önceden belirlenen yöntem çiftleri TB−SA6, ESK−TB ve ESK−SA6’dır; iki modelde toplam altı karşılaştırma yapılır. H₀: ortalama sapma farkı sıfırdır; H₁: fark sıfırdan farklıdır. Negatif fark ilk yöntemin lehinedir.

Sıradan eşleştirilmiş t testinin yanında, ana koşul ve b/h düzeyine göre tabakalı t testi (Satterthwaite serbestlik derecesi) uygulanır; tam deneyde 90 tabaka vardır. Altı karşılaştırmanın p değerleri Holm yöntemiyle düzeltilir. %95 güven aralıkları tabakalı t ve 2.000 tekrarlı tabakalı bootstrap ile verilir. İşaret testi, ortalama farktan bağımsız olarak kazanma yönünü sınar.

| Model | Çift | n | Ort. fark (yp) | Tabakalı t GA95 | Bootstrap GA95 | Sıradan t | Sıradan p | Tabakalı t | sd | Tabakalı p | Holm p | Çarpıklık | Süre oranı |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Yok satmasız | TB − SA6 | 300 | 0,754 | [0,567; 0,940] | [0,606; 0,910] | 7,128 | <0,0001 | 8,350 | 23,350 | <0,0001 | <0,0001 | 3,262 | 1,070 |
| Yok satmasız | ESK − TB | 300 | -0,636 | [-0,810; -0,461] | [-0,787; -0,503] | -6,756 | <0,0001 | -7,679 | 17,235 | <0,0001 | <0,0001 | -4,806 | 8,627 |
| Yok satmasız | ESK − SA6 | 300 | 0,118 | [0,032; 0,204] | [0,048; 0,187] | 2,337 | 0,0201 | 2,808 | 25,654 | 0,0094 | 0,0094 | 0,430 | 9,229 |
| Yok satmalı | TB − SA6 | 300 | -0,855 | [-1,225; -0,486] | [-1,138; -0,582] | -2,173 | 0,0306 | -5,001 | 12,912 | 0,0002 | 0,0005 | -3,962 | 1,048 |
| Yok satmalı | ESK − TB | 300 | -0,932 | [-1,102; -0,762] | [-1,077; -0,805] | -10,349 | <0,0001 | -11,441 | 19,211 | <0,0001 | <0,0001 | -3,177 | 10,898 |
| Yok satmalı | ESK − SA6 | 300 | -1,787 | [-2,145; -1,429] | [-2,054; -1,533] | -4,665 | <0,0001 | -11,052 | 10,475 | <0,0001 | <0,0001 | -4,085 | 11,420 |

- Yok satmasız, TB − SA6: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğini aşmaktadır. Eşit fark 172, uç değer 35, dışlanan çift 0.
- Yok satmasız, ESK − TB: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğini aşmaktadır. Eşit fark 203, uç değer 31, dışlanan çift 0.
- Yok satmasız, ESK − SA6: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğinin altındadır. Eşit fark 212, uç değer 88, dışlanan çift 0.
- Yok satmalı, TB − SA6: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğini aşmaktadır. Eşit fark 112, uç değer 51, dışlanan çift 0.
- Yok satmalı, ESK − TB: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğini aşmaktadır. Eşit fark 157, uç değer 14, dışlanan çift 0.
- Yok satmalı, ESK − SA6: Farklar belirgin biçimde çarpık veya ağır kuyrukludur (ya da örneklem küçüktür); t sonucu bootstrap aralığı ve fark dağılımıyla birlikte yorumlanmalıdır. Ortalama fark 0,5 yüzde puanlık pratik anlamlılık eşiğini aşmaktadır. Eşit fark 171, uç değer 129, dışlanan çift 0.

p ≥ 0,05 sonucu yöntemlerin eşit olduğu biçiminde yorumlanmaz. Farkların varyansı sıfırsa t ve p hesaplanmaz. Pratik anlamlılık eşiği 0,5 yüzde puandır. 300 temel problem iki modelde çözülür; bu 600 bağımsız problem anlamına gelmez. Süre ölçüm tekrarları ayrı problem sayılmaz.

## Süre ve yorumlama

Her problem/yöntem/model ısıtılır. En az 1 ms hedefiyle, üst sınırı 256 çözüm olan gruplar kalibre edilir; grup süresi çözüm sayısına bölünür. 5 tekrarın medyanı problem süresidir. Tablodaki medyan/P95 bu problem sürelerinin dağılımıdır. Yöntem sırası tohumla karıştırılır. Ön hesaplama dahildir; raporlama ve geçerlilik kontrolü hariçtir. JIT/GC ve saat çözünürlüğü küçük farkları etkiler. Süre oranı tanımlayıcıdır; 1'den küçükse ilk yöntem daha hızlıdır.

Klasik L4L/SM/LUC/LTC/PPB yöntemleri yok satmalı deneyde de yok satmasız planlarını üretir ve temel karşılaştırma olarak yer alır. TB/ESK/SA6 iki modelin olanaklarını kullanır. SA6 yalnız altı dönemlik parti sınırı altında en iyidir. Bu problem boyutlarında kesin DP, sezgisellerden daha hızlı çalışabilir. Ortalamalar problem başına yüzde sapmaların ortalamasıdır. Sonuçlar kontrollü sentetik deney tasarımı için geçerlidir.

## Tasarım kararları

- Deney 300 temel problemden oluşur; her problem iki modelde çözülür (600 model durumu).
- Birim üretim maliyeti c dönemler boyunca sabittir; bu nedenle yöntemlerin sıralamasını ve yüzde sapmayı etkilemez.
- İstatistiksel karşılaştırmalar TB−SA6, ESK−TB ve ESK−SA6 çiftleriyle yapılır; pratik anlamlılık eşiği 0,5 yüzde puandır.
- Talep dağılımı ve parametre düzeyleri kontrollü bir sentetik deney tasarımıdır.

## Doğrulama ve tekrar üretme

npm test

npm run benchmark -- --input experiments/problems.json --output /tmp/tez-tekrar

uv run --with scipy==1.18.1 python scripts/validate_thesis.py

Bağımsız MILP (SciPy/HiGHS) doğrulamasının sonucu experiments/validation.json dosyasındadır ve girdi parmak iziyle eşleştirilir. Yalnızca optimum durum koduyla biten MILP çözümleri kabul edilir.

## Kaynaklar

- Ders notları: Prof. Dr. Yakup Kara, PDF s. 243, 247–260, 370, 380–386, 867–876. LTC 470, PPB 430, WW 430 doğrulama örnekleri.
- [Eşleştirilmiş t-testi](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm)
- [Holm düzeltmesi](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html)
- [Yok satmalı ağ/DP yaklaşımı](https://pubsonline.informs.org/doi/10.1287/mnsc.15.9.506)

## Çalışma ortamı

{
  "node": "v25.9.0",
  "platform": "darwin",
  "arch": "arm64",
  "cpu": "Apple M2",
  "elapsedMs": 43801.989083,
  "sourceSHA256": {
    "src/lotSizing.js": "2bdc27403d038bc7b3d549fb57ba1aa4a65d7deb7e95a009aa26c683d9af351b",
    "src/experiments.js": "566f1e1eb75cb065d5dd1bb6bd48dd97fbf5b1f88aac363a92899757ae6fb0e7",
    "src/statistics.js": "ea18934c87cd621cdfe04d1b82daefaf570d3333f7361d636a331294eaadabeb",
    "src/experimentResult.js": "dd2613a5a5a214bba21e6cde7382863201a3804a4133e62674a56e30f1d9bfce"
  }
}

