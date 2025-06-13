# Cookie Monitor Dashboard

Modern ve güvenli bir cookie izleme ve analiz paneli. Bu dashboard, tarayıcı eklentisinden gelen cookie verilerini gerçek zamanlı olarak izlemenizi, analiz etmenizi ve yönetmenizi sağlar.

## Özellikler

### Veri Toplama
- Cookie detayları (domain, name, value, expires, vb.)
- Browser ve cihaz bilgileri
- Oturum takibi
- Ziyaret edilen sayfa bilgileri

### Gerçek Zamanlı İzleme
- Aktif kullanıcı sayısı
- Canlı cookie akışı
- Domain bazlı istatistikler
- WebSocket ile anlık güncellemeler

### Cookie Analizi
- Detaylı tablo görünümü
- Gelişmiş filtreleme ve arama
- Güvenlik analizi (secure, httpOnly, sameSite dağılımı)
- Zaman bazlı trendler

### Veri Görüntüleme
- JSON formatında detaylı görüntüleme
- Zaman bazlı dağılım grafikleri
- Domain bazlı analiz
- İnteraktif grafikler

### Veri Dışa Aktarma
- JSON, CSV, Excel formatları
- Toplu veya tekil dışa aktarma
- Otomatik yedekleme
- Özelleştirilebilir raporlar

### Güvenlik
- Hassas veri şifreleme
- API key doğrulama
- Rate limiting
- CORS yapılandırması

### Arama ve Filtreleme
- Gelişmiş arama seçenekleri
- Çoklu filtre desteği
- Arama geçmişi
- Özelleştirilebilir filtreler

### Uyarı Sistemi
- Yeni domain tespiti
- Toplu silme uyarıları
- Güvenlik değişikliği bildirimleri
- E-posta bildirimleri

## Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/yourusername/cookie-monitor.git
cd cookie-monitor
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Çevre değişkenlerini ayarlayın:
```bash
cp .env.example .env
```

4. .env dosyasını düzenleyin:
```env
ENCRYPTION_KEY=your-secure-key
JWT_SECRET=your-jwt-secret
```

5. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

## API Kullanımı

### Cookie Gönderme
```javascript
POST /api/webhook
Content-Type: application/json

{
  "userId": "user123",
  "cookies": [
    {
      "Name raw": "sessionId",
      "Content raw": "abc123",
      "Host raw": "example.com",
      "Send for raw": "true",
      "HTTP only raw": "true",
      "SameSite raw": "Strict"
    }
  ],
  "url": "https://example.com",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "Windows",
    "screen": "1920x1080"
  }
}
```

### Veri Alma
```javascript
GET /api/webhook?userId=user123&domain=example.com&startDate=2024-01-01&endDate=2024-12-31
```

### Veri Silme
```javascript
DELETE /api/webhook
Content-Type: application/json

{
  "ids": ["entry123", "entry456"],
  // veya
  "userId": "user123",
  // veya
  "deleteAll": true
}
```

## WebSocket Events

### Yeni Cookie'ler
```javascript
socket.on('newCookies', (data) => {
  console.log('New cookies:', data);
});
```

### Yeni Domain
```javascript
socket.on('newDomain', (data) => {
  console.log('New domain detected:', data.domain);
});
```

## Güvenlik

- Tüm hassas veriler AES-256 ile şifrelenir
- API istekleri JWT ile doğrulanır
- Rate limiting ile DDoS koruması sağlanır
- CORS politikaları ile güvenli erişim

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## İletişim

Proje Sahibi - [@yourusername](https://twitter.com/yourusername)
Proje Linki: [https://github.com/yourusername/cookie-monitor](https://github.com/yourusername/cookie-monitor)
