#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>
#include <WiFi.h>
#include <ArduinoWebsockets.h>

// ============================================================================
// CORTEX SLP / CROCODIL — MODÜL 105 NÖROMOTOR KİNEMATİK & AKUSTİK FIRMWARE
// ============================================================================
// Sensör Entegrasyonu:
// 1. MPU6050 (I2C):
//    - SDA: GPIO 21
//    - SCL: GPIO 22
// 2. INMP441 I2S Dijital Mikrofon:
//    - I2S_SCK (BCLK) = GPIO 14
//    - I2S_WS  (LRC)  = GPIO 15
//    - I2S_SD  (DATA) = GPIO 32
//    - L/R            = GND (Sol Kanal / I2S_CHANNEL_FMT_ONLY_LEFT)
// 3. AD8232 (sEMG):
//    - Analog OUT     = GPIO 34 (ADC1_CH6)
// ============================================================================

// ── Pin Tanımlamaları ────────────────────────────────────────────────────────
#define PIN_I2C_SDA      21
#define PIN_I2C_SCL      22
#define PIN_SEMG_ADC     34

#define I2S_SCK_PIN      14
#define I2S_WS_PIN       15
#define I2S_SD_PIN       32
#define I2S_PORT_NUM     I2S_NUM_0

// ── Wi-Fi & WebSocket Ayarları ───────────────────────────────────────────────
const char* WIFI_SSID       = "FiberHGW_ZY2B39";
const char* WIFI_PASSWORD   = "YrFvHpCPUbV7";
const char* WS_SERVER_HOST  = "192.168.1.143";
const uint16_t WS_SERVER_PORT = 8765;
const char* WS_SERVER_PATH  = "/ws/stream";

// ── Örnekleme Parametreleri ──────────────────────────────────────────────────
#define SAMPLE_PERIOD_MS    10   // 100 Hz sensör okuma frekansı
#define AUDIO_BUFFER_SIZE   256  // I2S blok okuma tamponu

// ── Sensör Veri Paketi Yapısı ────────────────────────────────────────────────
struct SensorData {
    uint32_t timestamp_ms;
    float imu_pitch_deg;
    float imu_roll_deg;
    float imu_yaw_deg;
    float imu_accel_x;
    float imu_accel_y;
    float imu_accel_z;
    float semg_left_uv;
    float semg_raw;
    float mic_rms_db;
    int mic_amplitude;
    bool mic_voiced;
    uint8_t hayden_level;
};

// Kuyruk ve WebSocket Nesneleri
QueueHandle_t sensorQueue = NULL;
Adafruit_MPU6050 mpu;
using namespace websockets;
WebsocketsClient wsClient;

volatile bool isTestActive = true;
int16_t audioBuffer[AUDIO_BUFFER_SIZE];

// ============================================================================
// 1. INMP441 I2S MİKROFON KURULUMU
// ============================================================================
void setupI2S() {
    const i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = 256,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    const i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SCK_PIN,
        .ws_io_num = I2S_WS_PIN,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_SD_PIN
    };

    esp_err_t err = i2s_driver_install(I2S_PORT_NUM, &i2s_config, 0, NULL);
    if (err == ESP_OK) {
        i2s_set_pin(I2S_PORT_NUM, &pin_config);
        i2s_zero_dma_buffer(I2S_PORT_NUM);
        Serial.println("[INMP441] I2S Dijital Mikrofon Basariyla Baslatildi (16 kHz, 16-bit).");
    } else {
        Serial.printf("[HATA] INMP441 I2S yuklenemedi: %d\n", err);
    }
}

bool isMpuConnected = false;

// ============================================================================
// 2. MPU6050 I2C JİROSKOP & İVMEÖLÇER KURULUMU
// ============================================================================
void setupMPU6050() {
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 400000); // 400 kHz Fast I2C

    if (!mpu.begin(0x68, &Wire)) {
        isMpuConnected = false;
        Serial.println("[UYARI] MPU6050 algilanamadi / bagli degil. Kinematik acilar 0.0 olarak ayarlandi.");
    } else {
        isMpuConnected = true;
        mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        Serial.println("[MPU6050] Mandibular Kinematik Sensoru Basariyla Baslatildi (I2C: 21, 22).");
    }
}

// ============================================================================
// 3. CORE 0: 100 HZ EŞZAMANLI SENSÖR & SES OKUMA GÖREVİ
// ============================================================================
void TaskSensor(void* pvParameters) {
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xFrequency = pdMS_TO_TICKS(SAMPLE_PERIOD_MS);

    float pitch = 0.0f;
    float roll  = 0.0f;
    float yaw   = 0.0f;
    const float alpha = 0.96f;
    const float dt = SAMPLE_PERIOD_MS / 1000.0f;

    Serial.println("[Core 0] Sensor & Ses Okuma Gorevi Baslatildi (100 Hz)");

    for (;;) {
        vTaskDelayUntil(&xLastWakeTime, xFrequency);

        // ── A. MPU6050 Kinematik Okuma (Sadece Sensör Bağlıysa) ──
        sensors_event_t a, g, temp;
        bool mpuSuccess = false;
        if (isMpuConnected) {
            mpuSuccess = mpu.getEvent(&a, &g, &temp);
        }

        if (mpuSuccess && isMpuConnected) {
            float accelPitch = atan2(a.acceleration.y, sqrt(a.acceleration.x * a.acceleration.x + a.acceleration.z * a.acceleration.z)) * 180.0f / PI;
            float accelRoll  = atan2(-a.acceleration.x, a.acceleration.z) * 180.0f / PI;

            float gyroPitchRate = g.gyro.x * 180.0f / PI;
            float gyroRollRate  = g.gyro.y * 180.0f / PI;
            float gyroYawRate   = g.gyro.z * 180.0f / PI;

            pitch = alpha * (pitch + gyroPitchRate * dt) + (1.0f - alpha) * accelPitch;
            roll  = alpha * (roll  + gyroRollRate  * dt) + (1.0f - alpha) * accelRoll;
            yaw  += gyroYawRate * dt;
        } else {
            pitch = 0.0f;
            roll  = 0.0f;
            yaw   = 0.0f;
        }

        // ── B. AD8232 sEMG Okuma (GPIO 34) ──
        // Donanım Koruması: AD8232 takılı değilse GPIO 34 boşta kalır ve ~0V okur.
        // Takılı AD8232'nin istirahat ofset voltajı 1.65V (~2048 ADC) civarındadır.
        // Sadece 150 < ADC < 3950 aralığında gerçek sEMG sinyali hesaplanır.
        int rawAdc = analogRead(PIN_SEMG_ADC);
        float semgUv = 0.0f;
        if (rawAdc > 150 && rawAdc < 3950) {
            float voltageMv = (rawAdc / 4095.0f) * 3300.0f;
            semgUv = fabsf(voltageMv - 1650.0f) * 10.0f;
        } else {
            // Sensör bağlı değil / Floating pin -> 0 µV
            semgUv = 0.0f;
        }

        // ── C. INMP441 I2S Mikrofon Okuma & Genlik Hesabı ──
        size_t bytesRead = 0;
        int average_amplitude = 0;
        float mic_rms_db = -60.0f;
        bool mic_voiced = false;

        esp_err_t audioErr = i2s_read(
            I2S_PORT_NUM,
            audioBuffer,
            sizeof(audioBuffer),
            &bytesRead,
            0 // Non-blocking: kuyruğu beklemeden o anki DMA örneğini al
        );

        if (audioErr == ESP_OK && bytesRead > 0) {
            int samplesRead = bytesRead / sizeof(int16_t);
            if (samplesRead > 0) {
                int64_t sum = 0;
                for (int i = 0; i < samplesRead; i++) {
                    sum += abs(audioBuffer[i]);
                }
                average_amplitude = sum / samplesRead;

                // dBFS Yaklaşımı
                if (average_amplitude > 0) {
                    mic_rms_db = 20.0f * log10f((float)average_amplitude / 32767.0f);
                    mic_rms_db = max(-60.0f, min(0.0f, mic_rms_db));
                }

                // Gürültü Eşiği Filtresi (> 50) -> Serial Monitor Çıktısı
                if (average_amplitude > 50) {
                    mic_voiced = true;
                    int barLength = constrain(average_amplitude / 30, 1, 60);
                    String barGraph = "";
                    for (int b = 0; b < barLength; b++) {
                        barGraph += "█";
                    }
                    Serial.printf("Ses Siddeti: %4d | %s\n", average_amplitude, barGraph.c_str());
                }
            }
        }

        // ── D. Sensör Veri Paketini Hazırla ve Kuyruğa Gönder ──
        SensorData data;
        data.timestamp_ms   = millis();
        data.imu_pitch_deg  = pitch;
        data.imu_roll_deg   = roll;
        data.imu_yaw_deg    = yaw;
        data.imu_accel_x    = mpuSuccess ? a.acceleration.x : 0.0f;
        data.imu_accel_y    = mpuSuccess ? a.acceleration.y : 0.0f;
        data.imu_accel_z    = mpuSuccess ? a.acceleration.z : 0.0f;
        data.semg_raw       = (float)rawAdc;
        data.semg_left_uv   = semgUv;
        data.mic_amplitude  = average_amplitude;
        data.mic_rms_db     = mic_rms_db;
        data.mic_voiced     = mic_voiced;
        data.hayden_level   = 4;

        if (sensorQueue != NULL) {
            xQueueSend(sensorQueue, &data, 0);
        }
    }
}

// ============================================================================
// 4. CORE 1: WI-FI & WEBSOCKET AĞ İLETİŞİMİ GÖREVİ
// ============================================================================
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.print("[Core 1] Wi-Fi baglaniliyor: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
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
            snprintf(jsonBuffer, sizeof(jsonBuffer),
                "{\"timestamp_ms\":%lu,\"imu_pitch_deg\":%.2f,\"imu_roll_deg\":%.2f,\"imu_yaw_deg\":%.2f,"
                "\"imu_accel_x\":%.2f,\"imu_accel_y\":%.2f,\"imu_accel_z\":%.2f,"
                "\"semg_left_uv\":%.1f,\"semg_right_uv\":0.0,\"semg_asymmetry_pct\":0.0,\"semg_raw\":%.0f,"
                "\"resp_waveform\":0.0,\"resp_rate_bpm\":0.0,\"mic_rms_db\":%.1f,\"mic_f0_hz\":0.0,\"mic_voiced\":%s,"
                "\"hayden_level\":%d,\"session_phase\":\"%s\"}",
                (unsigned long)data.timestamp_ms,
                data.imu_pitch_deg, data.imu_roll_deg, data.imu_yaw_deg,
                data.imu_accel_x, data.imu_accel_y, data.imu_accel_z,
                data.semg_left_uv, data.semg_raw,
                data.mic_rms_db,
                data.mic_voiced ? "true" : "false",
                (int)data.hayden_level,
                isTestActive ? "görev" : "istirahat"
            );

            wsClient.send(jsonBuffer);
        }
    }
}

// ============================================================================
// 5. SETUP & LOOP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==================================================");
    Serial.println("  CORTEX SLP — MPU6050 + INMP441 + AD8232 M105");
    Serial.println("==================================================");
    Serial.println("MPU6050 I2C : SDA=21, SCL=22");
    Serial.println("INMP441 I2S : SCK=14, WS=15, SD=32 (16kHz, 16-bit)");
    Serial.println("AD8232 sEMG : GPIO 34 (ADC1_CH6)");
    Serial.println("Esik Degeri : average_amplitude > 50\n");

    // 1. MPU6050 ve INMP441 Başlatma
    setupMPU6050();
    setupI2S();

    // 2. ADC Yapılandırması
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // 3. Çekirdekler Arası Kuyruk Oluştur (30 Paket Kapasiteli)
    sensorQueue = xQueueCreate(30, sizeof(SensorData));

    // 4. FreeRTOS Çift Çekirdek Görevlerini Başlat
    // Core 0: 100 Hz Sensör & Ses Okuma
    xTaskCreatePinnedToCore(
        TaskSensor,
        "TaskSensor",
        4096,
        NULL,
        2,  // Yüksek öncelik
        NULL,
        0   // Core 0
    );

    // Core 1: Wi-Fi & WebSocket İletişimi
    xTaskCreatePinnedToCore(
        TaskNetwork,
        "TaskNetwork",
        6144,
        NULL,
        1,  // Normal öncelik
        NULL,
        1   // Core 1
    );

    Serial.println("[SISTEM] Cift Cekirdek (Dual-Core) Gorevleri Basariyla Baslatildi.");
}

void loop() {
    // Tüm sensör ve ağ işlemleri FreeRTOS Core 0 ve Core 1 görevlerinde yürütülür.
    vTaskDelay(pdMS_TO_TICKS(1000));
}
