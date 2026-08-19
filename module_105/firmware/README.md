# Modül 105 — ESP32 Firmware Rehberi (Faz 2)

## 📌 Donanım Bağlantı Şeması

| Sensör / Modül | Sensör Pini | ESP32 Pini | Açıklama |
| :--- | :--- | :--- | :--- |
| **MPU6050** | VCC | 3.3V | Besleme |
| **MPU6050** | GND | GND | Toprak |
| **MPU6050** | SDA | **GPIO 21** | I2C Veri Hattı |
| **MPU6050** | SCL | **GPIO 22** | I2C Saat Hattı |
| **AD8232 (sEMG)** | 3.3V | 3.3V | Besleme |
| **AD8232 (sEMG)** | GND | GND | Toprak |
| **AD8232 (sEMG)** | OUTPUT | **GPIO 34** | **ADC1_CH6** (Wi-Fi ile çakışmayan analog pin) |

---

## 🛠️ Gerekli Kütüphaneler

### A) PlatformIO ile Yükleme (Tavsiye Edilen)
`platformio.ini` dosyasında tüm kütüphaneler tanımlıdır, PlatformIO otomatik indirecektir:
- `bblanchon/ArduinoJson @ ^7.0.4`
- `adafruit/Adafruit MPU6050 @ ^2.2.6`
- `adafruit/Adafruit Unified Sensor @ ^1.1.14`
- `adafruit/Adafruit BusIO @ ^1.16.1`
- `gilmaimon/ArduinoWebsockets @ ^0.5.4`

### B) Arduino IDE ile Yükleme
Arduino IDE > **Tools > Manage Libraries (Ctrl+Shift+I)** açarak şu kütüphaneleri aratıp kurun:
1. `ArduinoJson` (Benoît Blanchon)
2. `Adafruit MPU6050` (Adafruit)
3. `ArduinoWebsockets` (Gil Maimon)

---

## 🚀 Adım Adım Çalıştırma

1. **Ağ ve IP Ayarları:**
   - [module_105/firmware/src/main.cpp](file:///c:/cortex_slp-1/module_105/firmware/src/main.cpp) dosyasını açın.
   - `WIFI_SSID` ve `WIFI_PASSWORD` bilgilerini girin.
   - `WS_SERVER_HOST` değişkenine bilgisayarınızın yerel ağ IP'sini yazın (örn: `"192.168.1.100"`).

2. **Python Sunucusunu Başlatın:**
   ```bash
   cd module_105/server
   python main.py
   ```

3. **ESP32'yi Flaşlayın:**
   - PlatformIO: `PlatformIO: Upload`
   - Arduino IDE: Portu seçip `Upload` (Baud: 115200)

4. **Web Arayüzünden İzleyin:**
   - Tarayıcıda `http://localhost:3000/crocodil/modul105` adresine gidin.
   - "CANLI" durumu ve 100 FPS veri akışı ekranda görünecektir!
