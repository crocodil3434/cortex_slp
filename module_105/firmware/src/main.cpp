/**
 * ============================================================================
 * PROMPT Kinematik & Akustik İstasyonu — Modül 105
 * ESP32 C++ (FreeRTOS Dual-Core) Firmware
 * ============================================================================
 * 
 * Donanım Bağlantıları:
 * ----------------------------------------------------------------------------
 * 1. MPU6050 (I2C):
 *    - VCC  -> 3.3V
 *    - GND  -> GND
 *    - SDA  -> GPIO 21
 *    - SCL  -> GPIO 22
 * 
 * 2. AD8232 (sEMG):
 *    - 3.3V -> 3.3V
 *    - GND  -> GND
 *    - OUT  -> GPIO 34 (ADC1_CH6) [Wi-Fi ile çakışmayan güvenli ADC1 kanalı]
 * 
 * FreeRTOS Çift Çekirdek (Dual-Core) Mimarisi:
 * ----------------------------------------------------------------------------
 * - CORE 0 (Task 1 - SensorTask) : 100 Hz (10ms) periyodik MPU6050 & ADC1 okuma
 * - CORE 1 (Task 2 - NetworkTask): Wi-Fi & WebSocket Client JSON veri aktarımı
 * 
 * Kütüphaneler:
 *   - ArduinoJson (v6 veya v7)
 *   - Adafruit MPU6050 & Adafruit Unified Sensor
 *   - ArduinoWebsockets (by Gil Maimon)
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>

// ============================================================================
// 1. KULLANICI AĞ & SUNUCU KONFİGÜRASYONU
// ============================================================================
const char* WIFI_SSID     = "FiberHGW_ZY2B39";     // Wi-Fi Ağ Adı
const char* WIFI_PASSWORD = "YrFvHpCPUbV7";        // Wi-Fi Şifresi

// Python sunucunuzun yerel ağdaki IP adresi
const char* WS_SERVER_HOST = "192.168.1.142";
const uint16_t WS_SERVER_PORT = 8765;
const char* WS_SERVER_PATH = "/ws/stream";

// ============================================================================
// 2. PIN & DONANIM SABİTLERİ
// ============================================================================
#define PIN_I2C_SDA     21
#define PIN_I2C_SCL     22
#define PIN_SEMG_ADC    34   // ADC1_CH6 (GPIO 34)

#define SAMPLE_RATE_HZ  100
#define SAMPLE_PERIOD_MS (1000 / SAMPLE_RATE_HZ) // 10 ms

// ============================================================================
// 3. VERİ YAPILARI & FREERTOS KUYRUĞU
// ============================================================================
struct SensorData {
    uint32_t timestamp_ms;
    float imu_pitch_deg;
    float imu_roll_deg;
    float imu_yaw_deg;
    float imu_accel_x;
    float imu_accel_y;
    float imu_accel_z;
    float semg_raw;         // 0 - 4095 ADC Ham Değeri
    float semg_mv;          // Milivolt cinsinden voltaj
    float semg_left_uv;     // Tahmini mikrovolt RMS/aktivasyon
    uint8_t hayden_level;   // 1-7 aktif seviye (varsayılan: 4 - Artikülasyon)
};

// Core 0 ile Core 1 arasında veri aktarımı sağlayan kuyruk (Queue)
QueueHandle_t sensorQueue = NULL;
const int QUEUE_SIZE = 30;

// Global Sensör Nesneleri
Adafruit_MPU6050 mpu;
using namespace websockets;
WebsocketsClient wsClient;

// ============================================================================
// 4. CORE 0: SENSÖR OKUMA GÖREVİ (100 Hz Strict Interval)
// ============================================================================
// Global Durum Değişkeni (Test Başlat / Sonlandır)
volatile bool isTestActive = true; // Varsayılan: Açık/Akışta

void TaskSensor(void* pvParameters) {
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xFrequency = pdMS_TO_TICKS(SAMPLE_PERIOD_MS);

    float pitch = 0.0f;
    float roll  = 0.0f;
    float yaw   = 0.0f;
    const float alpha = 0.96f;
    const float dt = SAMPLE_PERIOD_MS / 1000.0f;

    Serial.println("[Core 0] Sensor Task baslatildi (100 Hz)");

    for (;;) {
        vTaskDelayUntil(&xLastWakeTime, xFrequency);

        sensors_event_t a, g, temp;
        bool mpuSuccess = mpu.getEvent(&a, &g, &temp);

        int rawAdc = analogRead(PIN_SEMG_ADC);
        float voltageMv = (rawAdc / 4095.0f) * 3300.0f;
        float semgUv = fabsf(voltageMv - 1650.0f) * 10.0f;

        if (mpuSuccess) {
            float accelPitch = atan2(a.acceleration.y, sqrt(a.acceleration.x * a.acceleration.x + a.acceleration.z * a.acceleration.z)) * 180.0f / PI;
            float accelRoll  = atan2(-a.acceleration.x, a.acceleration.z) * 180.0f / PI;

            float gyroPitchRate = g.gyro.x * 180.0f / PI;
            float gyroRollRate  = g.gyro.y * 180.0f / PI;
            float gyroYawRate   = g.gyro.z * 180.0f / PI;

            pitch = alpha * (pitch + gyroPitchRate * dt) + (1.0f - alpha) * accelPitch;
            roll  = alpha * (roll  + gyroRollRate  * dt) + (1.0f - alpha) * accelRoll;
            yaw  += gyroYawRate * dt;
        }

        SensorData data;
        data.timestamp_ms   = millis();
        data.imu_pitch_deg  = pitch;
        data.imu_roll_deg   = roll;
        data.imu_yaw_deg    = yaw;
        data.imu_accel_x    = mpuSuccess ? a.acceleration.x : 0.0f;
        data.imu_accel_y    = mpuSuccess ? a.acceleration.y : 0.0f;
        data.imu_accel_z    = mpuSuccess ? a.acceleration.z : 0.0f;
        data.semg_raw       = (float)rawAdc;
        data.semg_mv        = voltageMv;
        data.semg_left_uv   = semgUv;
        data.hayden_level   = 4;

        if (sensorQueue != NULL) {
            xQueueSend(sensorQueue, &data, 0);
        }
    }
}

// ============================================================================
// 5. CORE 1: WI-FI & WEBSOCKET AĞ İLETİŞİMİ GÖREVİ
// ============================================================================
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.print("[Core 1] Wi-Fi baglaniliyor: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false); // Wi-Fi Modem Sleep kapat (Sıfır gecikme)
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int retryCount = 0;
    while (WiFi.status() != WL_CONNECTED && retryCount < 20) {
        delay(500);
        Serial.print(".");
        retryCount++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[Core 1] Wi-Fi Baglandi! IP Adresi: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n[Core 1] Wi-Fi baglanti basarisiz, yeniden denenecek...");
    }
}

void connectWebSocket() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (wsClient.available()) return;

    Serial.printf("[Core 1] WebSocket sunucusuna baglaniliyor: ws://%s:%d%s\n", 
                  WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);

    bool connected = wsClient.connect(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
    if (connected) {
        Serial.println("[Core 1] WebSocket baglantisi BASARILI!");
    } else {
        Serial.println("[Core 1] WebSocket baglanti basarisiz! (Sunucu acik mi?)");
    }
}

void TaskNetwork(void* pvParameters) {
    Serial.println("[Core 1] Network Task baslatildi");

    // Sunucudan gelen Test Başlat / Durdur komutlarını dinle
    wsClient.onMessage([](WebsocketsMessage message) {
        String msg = message.data();
        if (msg.indexOf("start_test") >= 0 || msg.indexOf("start") >= 0) {
            isTestActive = true;
            Serial.println("[ESP32] >>> TEST BASLATILDI <<<");
        } else if (msg.indexOf("stop_test") >= 0 || msg.indexOf("stop") >= 0) {
            isTestActive = false;
            Serial.println("[ESP32] >>> TEST DURDURULDU <<<");
        }
    });

    wsClient.onEvent([](WebsocketsEvent event, String data) {
        if (event == WebsocketsEvent::ConnectionOpened) {
            Serial.println("[Core 1] WS Baglantisi Acildi");
        } else if (event == WebsocketsEvent::ConnectionClosed) {
            Serial.println("[Core 1] WS Baglantisi Kapandi");
        }
    });

    connectWiFi();
    connectWebSocket();

    SensorData data;
    char jsonBuffer[384];

    for (;;) {
        if (WiFi.status() != WL_CONNECTED) {
            connectWiFi();
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue;
        }

        if (!wsClient.available()) {
            connectWebSocket();
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue;
        }

        wsClient.poll();

        if (xQueueReceive(sensorQueue, &data, pdMS_TO_TICKS(10)) == pdTRUE) {
            // Yüksek performanslı, sıfır heap tahsisli (zero-allocation) JSON formatlama
            snprintf(jsonBuffer, sizeof(jsonBuffer),
                "{\"timestamp_ms\":%lu,\"imu_pitch_deg\":%.2f,\"imu_roll_deg\":%.2f,\"imu_yaw_deg\":%.2f,"
                "\"imu_accel_x\":%.2f,\"imu_accel_y\":%.2f,\"imu_accel_z\":%.2f,"
                "\"semg_left_uv\":%.1f,\"semg_right_uv\":0.0,\"semg_asymmetry_pct\":0.0,\"semg_raw\":%.0f,"
                "\"resp_waveform\":0.0,\"resp_rate_bpm\":0.0,\"mic_rms_db\":-60.0,\"mic_f0_hz\":0.0,\"mic_voiced\":false,"
                "\"hayden_level\":%d,\"session_phase\":\"%s\"}",
                (unsigned long)data.timestamp_ms,
                data.imu_pitch_deg, data.imu_roll_deg, data.imu_yaw_deg,
                data.imu_accel_x, data.imu_accel_y, data.imu_accel_z,
                data.semg_left_uv, data.semg_raw,
                (int)data.hayden_level,
                isTestActive ? "görev" : "istirahat"
            );

            wsClient.send(jsonBuffer);
        }
    }
}

// ============================================================================
// 6. SETUP & MAIN LOOP
// ============================================================================
void setup() {
    // Seri Port (Sadece hata ve durum logları için)
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n========================================================");
    Serial.println("  Modül 105 — PROMPT Kinematik & Akustik İstasyonu");
    Serial.println("  ESP32 Dual-Core FreeRTOS Firmware v1.0");
    Serial.println("========================================================");

    // ADC Konfigürasyonu (GPIO 34 / ADC1_CH6)
    analogReadResolution(12); // 0-4095
    analogSetAttenuation(ADC_11db); // 0 - 3.3V ölçüm aralığı
    pinMode(PIN_SEMG_ADC, INPUT);

    // I2C Başlatma (SDA=21, SCL=22, 400kHz Fast Mode)
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000);

    // MPU6050 Başlatma
    Serial.println("[Setup] MPU6050 baslatiliyor...");
    if (!mpu.begin(0x68, &Wire)) {
        Serial.println("[HATA] MPU6050 bulunamadi! Baglantilari kontrol edin.");
        while (1) { delay(1000); }
    }
    Serial.println("[Setup] MPU6050 basariyla baglandi!");

    // MPU6050 Ölçüm Aralıkları
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);

    // FreeRTOS Kuyruğu Oluştur
    sensorQueue = xQueueCreate(QUEUE_SIZE, sizeof(SensorData));
    if (sensorQueue == NULL) {
        Serial.println("[HATA] FreeRTOS Queue olusturulamadi!");
        while (1) { delay(1000); }
    }

    // FreeRTOS Çift Çekirdek Görevlerini Başlat:
    // Core 0: Sensör Ölçüm Görevi (Öncelik: 2 - Yüksek)
    xTaskCreatePinnedToCore(
        TaskSensor,         // Görev Fonksiyonu
        "SensorTask",       // Görev Adı
        4096,               // Stack Boyutu (Byte)
        NULL,               // Parametre
        2,                  // Öncelik
        NULL,               // Görev Tanımlayıcısı
        0                   // ÇEKİRDEK 0 (Core 0)
    );

    // Core 1: Wi-Fi & WebSocket Ağ Görevi (Öncelik: 1 - Standart)
    xTaskCreatePinnedToCore(
        TaskNetwork,        // Görev Fonksiyonu
        "NetworkTask",      // Görev Adı
        8192,               // Stack Boyutu (Byte)
        NULL,               // Parametre
        1,                  // Öncelik
        NULL,               // Görev Tanımlayıcısı
        1                   // ÇEKİRDEK 1 (Core 1)
    );

    Serial.println("[Setup] Tum FreeRTOS gorevleri baslatildi.");
}

void loop() {
    // Tüm operasyon FreeRTOS Task'lerinde yürüdüğü için loop boş bırakılır.
    vTaskDelete(NULL); // Ana loop task'ını temizleyerek bellek tasarrufu sağla
}
