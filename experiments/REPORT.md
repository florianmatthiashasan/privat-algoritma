# Parti büyüklüğü: tez deneyi

Model: thesis-v2.0.0; tasarım: balanced-factorial-v2; istatistik: paired-stratified-v1.0.0.

300 temel problem × iki model; 5400 yöntem sonucu. Tohum 20261018; süre tekrarı 5; sabit c=0. Geçerlilik hatası: 0. Oluşturma: 2026-10-18T18:13:18.198Z.

Girdi SHA-256: 15fed892c2585742d6776b3ec2015e6800791f4c9dd0cb719e66b5a5dd945549.

## Model ve maliyet tanımı

Tek ürün; bilinen deterministik talep; kapasitesiz; sıfır tedarik süresi; sıfır başlangıç/bitiş net stoku; kayıp satış yok.

Sapma: hazırlık + stok + gecikme karar maliyeti. Sabit birim üretim maliyeti ayrıca gösterilir; yüzde sapma paydasına dahil değildir.

Denge: N_t=N_(t−1)+Q_t−D_t; N_0=N_T=0. Karar maliyeti: Σ[A_t·1(Q_t>0)+h_t max(N_t,0)+b_t max(−N_t,0)]. Üretim dahil toplam: C+cΣD_t. Sapma: 100(C−C*)/C*. Sıfır optimumda sıfır maliyet %0; pozitif maliyetin yüzde sapması tanımsızdır ve hata sayılır.

## Deney tasarımı

3 ufuk × 2 hedef CV × 5 hazırlık oranı × 10 tekrar = 300 temel problem. Gamma talep, ortalama 100; h=1. b/h=0,25/1/4 dönüşümlü ve 300 problemde dengeli; dördüncü tam faktör değildir.

Bu çalışma 30 hücrenin her birinde 10 bağımsız problem içerir. Gamma talepler tamsayıya yuvarlanır; hedef CV 0,2/1, gerçekleşen CV ve ortalama girdilerde saklanır. Rassallık girdilerin üretilmesindedir; bütün talepler çözüm sırasında bilinir. Gerçek işletme dağılımı iddiası yoktur.

## Yok satma yasak

Kesin referans: Wagner–Whitin.

| Yöntem | Ortalama karar maliyeti | Ortalama toplam (üretim dahil) | Ortalama sapma % [tekil GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | n / hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 4223.13 | 4223.13 | 0.000 [0.000; 0.000] | 0.000 | 0.000 | 0.000 | 100.0 | 0.0256 | 0.0880 | 300 / 0 |
| Sınırlı aralık araması | 4235.64 | 4235.64 | 0.129 [0.087; 0.179] | 0.000 | 0.724 | 5.549 | 93.7 | 0.0227 | 0.0721 | 300 / 0 |
| Ekle–sil–kaydır | 4237.75 | 4237.75 | 0.247 [0.192; 0.310] | 0.000 | 1.534 | 5.093 | 75.3 | 0.2222 | 2.0943 | 300 / 0 |
| Tasarruflu birleştirme | 4276.45 | 4276.45 | 0.883 [0.742; 1.036] | 0.000 | 3.852 | 14.783 | 58.7 | 0.0242 | 0.0794 | 300 / 0 |
| Silver-Meal | 4318.23 | 4318.23 | 1.696 [1.494; 1.900] | 0.860 | 6.534 | 14.938 | 37.3 | 0.0050 | 0.0107 | 300 / 0 |
| Least Total Cost | 4343.68 | 4343.68 | 2.318 [2.071; 2.562] | 0.928 | 9.414 | 17.792 | 37.0 | 0.0049 | 0.0104 | 300 / 0 |
| Part-Period Balancing | 4606.73 | 4606.73 | 10.722 [10.031; 11.426] | 7.858 | 27.251 | 60.631 | 7.3 | 0.0049 | 0.0101 | 300 / 0 |
| Least Unit Cost | 4938.35 | 4938.35 | 22.492 [20.358; 25.034] | 7.682 | 70.671 | 325.342 | 21.7 | 0.0050 | 0.0107 | 300 / 0 |
| Lot-for-Lot | 8242.67 | 8242.67 | 64.746 [63.535; 65.876] | 49.168 | 166.325 | 217.933 | 10.0 | 0.0026 | 0.0052 | 300 / 0 |

## Yok satmaya izin var (ertelenmiş talep)

Kesin referans: Zangwill aralık DP.

| Yöntem | Ortalama karar maliyeti | Ortalama toplam (üretim dahil) | Ortalama sapma % [tekil GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | n / hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 3402.96 | 3402.96 | 0.000 [0.000; 0.000] | 0.000 | 0.000 | 0.000 | 100.0 | 0.0337 | 0.1545 | 300 / 0 |
| Ekle–sil–kaydır | 3416.25 | 3416.25 | 0.308 [0.251; 0.370] | 0.000 | 1.810 | 5.105 | 72.0 | 0.2964 | 3.1617 | 300 / 0 |
| Tasarruflu birleştirme | 3461.77 | 3461.77 | 1.240 [1.106; 1.391] | 0.474 | 4.719 | 12.378 | 43.7 | 0.0258 | 0.0849 | 300 / 0 |
| Sınırlı aralık araması | 3465.71 | 3465.71 | 2.095 [1.859; 2.362] | 0.000 | 15.434 | 49.635 | 78.0 | 0.0251 | 0.0779 | 300 / 0 |
| Silver-Meal | 4318.23 | 4318.23 | 29.074 [28.598; 29.581] | 14.792 | 92.895 | 105.767 | 14.0 | 0.0059 | 0.0122 | 300 / 0 |
| Least Total Cost | 4343.68 | 4343.68 | 29.920 [29.288; 30.571] | 15.592 | 94.502 | 132.301 | 14.7 | 0.0057 | 0.0121 | 300 / 0 |
| Part-Period Balancing | 4606.73 | 4606.73 | 39.967 [38.895; 40.995] | 25.490 | 104.986 | 130.205 | 1.7 | 0.0057 | 0.0119 | 300 / 0 |
| Least Unit Cost | 4938.35 | 4938.35 | 54.608 [52.279; 57.327] | 42.117 | 150.165 | 325.342 | 10.0 | 0.0059 | 0.0124 | 300 / 0 |
| Lot-for-Lot | 8242.67 | 8242.67 | 113.586 [111.691; 115.453] | 78.356 | 351.885 | 495.118 | 6.7 | 0.0034 | 0.0068 | 300 / 0 |

## Eşleştirilmiş istatistik

Önceden tanımlı çiftler: TB−SA6, ESK−TB, ESK−SA6; iki modelde toplam 6 karşılaştırma. H0: ortalama sapma farkı 0, H1: farklı. Negatif fark ilk yöntem lehine.

Sıradan eşleştirilmiş t yanında ana koşul ve b/h alt seviyesine göre tabakalı fark-ortalaması t yaklaşımı (Satterthwaite df) verilir. Tam deneyde 90 çıkarım tabakası vardır; tabaka içi varyanslar kullanılır. Sonuçlar yaklaşık ve varsayımlara duyarlıdır. Holm ailesi filtrelerden bağımsız tam 6 karşılaştırmadır. Tekil %95 GA eşzamanlı GA değildir. Tabakalı eşleştirilmiş bootstrap 2000 tekrar; işaret testi kazanma yönünü sınar, ortalama farkı değil.

| Model | Çift | n | Ort. fark (yp) | Tabakalı t GA95 | Bootstrap GA95 | Sıradan t | Sıradan p | Tabakalı t | sd | Tabakalı p | Holm p | Çarpıklık | Süre oranı |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| noBacklog | merge − window | 300 | 0.754 | [0.567; 0.940] | [0.606; 0.910] | 7.128 | 7.668423689027162e-12 | 8.350 | 23.350 | 1.8149108160518928e-8 | 9.074554080259464e-8 | 3.262 | 1.070 |
| noBacklog | local − merge | 300 | -0.636 | [-0.810; -0.461] | [-0.787; -0.503] | -6.756 | 7.428666386922533e-11 | -7.679 | 17.235 | 5.806294128397356e-7 | 0.0000017418882385192067 | -4.806 | 8.627 |
| noBacklog | local − window | 300 | 0.118 | [0.032; 0.204] | [0.048; 0.187] | 2.337 | 0.02008973867195679 | 2.808 | 25.654 | 0.009403424062688102 | 0.009403424062688102 | 0.430 | 9.229 |
| backlog | merge − window | 300 | -0.855 | [-1.225; -0.486] | [-1.138; -0.582] | -2.173 | 0.030559452892406254 | -5.001 | 12.912 | 0.00024757601689144636 | 0.0004951520337828927 | -3.962 | 1.048 |
| backlog | local − merge | 300 | -0.932 | [-1.102; -0.762] | [-1.077; -0.805] | -10.349 | 1.1744775717511693e-21 | -11.441 | 19.211 | 5.066243835688757e-10 | 3.0397463014132542e-9 | -3.177 | 10.898 |
| backlog | local − window | 300 | -1.787 | [-2.145; -1.429] | [-2.054; -1.533] | -4.665 | 0.000004661867076890601 | -11.052 | 10.475 | 4.1907116569615864e-7 | 0.0000016762846627846346 | -4.085 | 11.420 |

- noBacklog, merge−window: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın. Eşit fark 172, uç değer 35, dışlanan çift 0.
- noBacklog, local−merge: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın. Eşit fark 203, uç değer 31, dışlanan çift 0.
- noBacklog, local−window: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğinin altında. Eşit fark 212, uç değer 88, dışlanan çift 0.
- backlog, merge−window: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın. Eşit fark 112, uç değer 51, dışlanan çift 0.
- backlog, local−merge: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın. Eşit fark 157, uç değer 14, dışlanan çift 0.
- backlog, local−window: Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin. Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın. Eşit fark 171, uç değer 129, dışlanan çift 0.

p≥0,05 eşitlik veya optimumluk kanıtı değildir. Sıfır varyanslı farklarda t/p tanımsız raporlanır. 0,5 yüzde puan pratik eşik araştırmacı önerisidir. 300 temel problem iki modda 600 bağımsız problem sayılmaz; süre tekrarları yeni problem değildir.

## Süre ve yorumlama

Her problem/yöntem/model ısıtılır. En az 1 ms hedefiyle, üst sınırı 256 çözüm olan gruplar kalibre edilir; grup süresi çözüm sayısına bölünür. 5 tekrarın medyanı problem süresidir. Tablodaki medyan/P95 bu problem sürelerinin dağılımıdır. Yöntem sırası tohumla karıştırılır. Ön hesaplama dahildir; raporlama ve geçerlilik kontrolü hariçtir. JIT/GC ve saat çözünürlüğü küçük farkları etkiler. Süre oranı tanımlayıcıdır; 1'den küçükse ilk yöntem daha hızlıdır.

Klasik L4L/SM/LUC/LTC/PPB yok satmalı deneyde yok satmasız temel planlarını üretir; gecikme olanağına uyarlanmış yöntem olarak sunulmaz. TB/ESK/SA6 iki modelin olanaklarını kullanır. SA6 yalnız altı dönemlik parti sınırı altında en iyidir. Kesin DP bu boyutlarda sezgisellerden daha hızlı olabilir. Ortalamalar problem başına yüzdelerin ortalamasıdır; toplam maliyet oranı değildir. Deney sonuçları sentetik tasarıma koşulludur.

## Hocayla teyit edilecek araştırmacı önerileri

- 300 temel problemin iki modelde incelenmesi başlangıç önerisidir; hocayla teyit edilecek.
- İlk sürümde c dönemler boyunca sabittir; dönemlik c_t gereksinimi hocayla teyit edilecek.
- Zorunlu yöntemler, test çiftleri ve pratik eşik hocayla teyit edilecek.

## Doğrulama ve tekrar üretme

npm test

npm run benchmark -- --input experiments/problems.json --output /tmp/tez-tekrar

uv run --with scipy==1.18.1 python scripts/validate_thesis.py

Bağımsız MILP ve SciPy kontrolünün gerçek sonucu experiments/validation.json dosyasındadır; bu dosya bulunmadan harici doğrulama yapılmış sayılmaz. Parmak izi ilgili girdilerle eşleştirilmelidir. Süre sınırına ulaşan MILP sonucu optimum kabul edilmez.

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

