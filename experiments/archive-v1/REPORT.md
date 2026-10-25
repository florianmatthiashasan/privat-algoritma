# Rassal parti büyüklüğü deneyi

300 temel problem, iki model, 5400 yöntem sonucu. Tohum: 20261018. Altı talep ailesi varsayılan 300 problemde 50'şer örnek içerir. Ufuklar 8, 12, 24 ve 48 dönemdir.

Geçerlilik hatası: **0**. Yok satma olanağının kesin optimum maliyetinde sağladığı ortalama azalma: **%19.03**, medyan azalma: **%8.47**.

## Yok satma yasak

| Yöntem | Ortalama sapma % [GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | Hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 0.00 [0.00; 0.00] | 0.00 | 0.00 | 0.00 | 100.00 | 0.0073 | 0.0710 | 0 |
| Ekle–sil–kaydır | 0.12 [0.08; 0.17] | 0.00 | 0.94 | 4.18 | 86.00 | 0.0626 | 1.5580 | 0 |
| Sınırlı aralık araması | 0.18 [0.10; 0.28] | 0.00 | 1.11 | 8.79 | 92.33 | 0.0071 | 0.0609 | 0 |
| Tasarruflu birleştirme | 1.50 [1.01; 2.08] | 0.00 | 6.07 | 43.73 | 68.33 | 0.0076 | 0.0723 | 0 |
| Silver-Meal | 10.61 [7.86; 13.53] | 0.53 | 69.40 | 262.40 | 43.67 | 0.0027 | 0.0100 | 0 |
| Part-Period Balancing | 17.72 [15.70; 19.81] | 9.00 | 65.34 | 199.14 | 12.33 | 0.0026 | 0.0096 | 0 |
| Least Total Cost | 17.72 [15.70; 19.81] | 9.00 | 65.34 | 199.14 | 12.33 | 0.0027 | 0.0096 | 0 |
| Least Unit Cost | 21.04 [17.71; 24.30] | 6.40 | 99.14 | 231.73 | 23.33 | 0.0027 | 0.0099 | 0 |
| Lot-for-Lot | 78.24 [65.30; 90.51] | 28.34 | 206.92 | 809.01 | 15.67 | 0.0013 | 0.0046 | 0 |

## Yok satmaya izin var

| Yöntem | Ortalama sapma % [GA95] | Medyan % | P95 % | En kötü % | Optimum % | Medyan ms | P95 ms | Hata |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Kesin dinamik programlama | 0.00 [0.00; 0.00] | 0.00 | 0.00 | 0.00 | 100.00 | 0.0090 | 0.1306 | 0 |
| Ekle–sil–kaydır | 0.18 [0.12; 0.25] | 0.00 | 1.04 | 5.15 | 81.00 | 0.0918 | 2.1092 | 0 |
| Tasarruflu birleştirme | 2.79 [1.91; 3.81] | 0.00 | 12.29 | 94.13 | 55.67 | 0.0087 | 0.0785 | 0 |
| Sınırlı aralık araması | 3.33 [2.21; 4.42] | 0.00 | 33.78 | 74.03 | 77.00 | 0.0082 | 0.0613 | 0 |
| Silver-Meal | 51.60 [44.34; 59.48] | 19.12 | 185.32 | 552.90 | 19.33 | 0.0027 | 0.0099 | 0 |
| Part-Period Balancing | 61.16 [53.93; 68.52] | 33.56 | 182.38 | 567.60 | 6.67 | 0.0027 | 0.0097 | 0 |
| Least Total Cost | 61.16 [53.93; 68.52] | 33.56 | 182.38 | 567.60 | 6.67 | 0.0027 | 0.0096 | 0 |
| Least Unit Cost | 64.64 [57.07; 72.17] | 36.87 | 195.80 | 546.28 | 13.00 | 0.0027 | 0.0100 | 0 |
| Lot-for-Lot | 151.99 [131.40; 171.95] | 69.74 | 603.45 | 1152.24 | 9.67 | 0.0013 | 0.0045 | 0 |

## Yorumlama

Sapma, her problemde aynı modelin kesin optimumuna göre hesaplanır: 100 × (C − C*) / C*. Tablodaki ortalama, problem başına yüzdelerin aritmetik ortalamasıdır; maliyet toplamlarının oranı değildir. P95 kuyruk performansını gösterir. GA95, talep ailesi içinde 1.000 tekrarlı yüzdelik bootstrap güven aralığıdır; sentetik problem üretecinin bu tasarımına koşulludur ve gerçek müşteri taleplerine genellenemez. Alt gruplar farklı güçlükte olabileceği için uygulamadaki aile ve dönem filtrelerini de inceleyin.

Optimum oranı tüm eşit maliyetli yöntemleri başarı sayar; sıralama bağları başarısızlık sayılmaz. Tolerans 1e-7 × max(1,C*)'dır. PPB ve LTC bu uygulamada aynı doğrusal maliyet dengeleme kuralıdır; bağımsız iki başarı kanıtı sayılmaz. L4L/SM/LUC/PPB/LTC yok satmalı deneyde yok satmasız planlarını korur; geçerli temel karşılaştırmalardır. Üç ek yöntem, her iki modelin seçeneklerini kullanır. SA6 altı dönemlik parti sınırı altında en iyidir; küresel optimum garantisi yoktur.

Her problem/yöntem/model ısıtılır; 1 ms hedefiyle en fazla 256 çözüm içeren ölçüm grubu kalibre edilir. Grup süresi çözüm sayısına bölünür; 5 tekrarın medyanı alınır. Bu yaklaşım tarayıcının kısa süreleri sıfıra yuvarlamasını azaltır. Tabloda bu medyanların medyanı ve P95'i gösterilir. Yöntem sırası deterministik olarak karıştırılır. Girdi hazırlığı her yöntemin süresine dahildir; raporlama, denetim ve referans maliyetin hesaplanması hariçtir. Bu boyutlarda kesin DP zaten hızlıdır; yerel arama daha yavaş olabilir. Sezgiseller için genel bir hız üstünlüğü iddia edilmez. Çok kısa ölçümlerde JIT, çöp toplama ve zamanlayıcı çözünürlüğü etkilidir; küçük süre farklarıyla güçlü hız iddiası kurmayın.

Model tek ürünlü, deterministik ve kapasitesizdir; başlangıç ve bitiş net stoku sıfırdır. Değişken üretim maliyeti ve kayıp satış yoktur. Yok satma, sonraki dönemde teslim edilen gecikmiş talep anlamındadır. Bağımsız küçük-problem üretim enumerasyonu, örnek problem, ölçekleme ve denge kontrolleri için npm test çalıştırın.

## Tekrar üretme

npm run benchmark -- --input experiments/problems.json --output /tmp/parti-tekrar

Aynı girdiler aynı maliyetleri ve planları verir; süreler ve tarih ortamla değişir. Yeni bir örneklem için --seed 20261019 kullanın. Ham CSV ve tam planları içeren results.json ile her bulgu izlenebilir.


## Ortam

v25.9.0, darwin/arm64, Apple M2. Oluşturma: 2026-10-18T17:36:43.897Z. Toplam süre: 37.90 saniye. Tarayıcıdaki worker ölçümleri Node ölçümleriyle birebir aynı değildir.
