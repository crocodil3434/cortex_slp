import asyncio, json, websockets, time

async def test():
    uri = "ws://127.0.0.1:8765/ws/stream?hayden_level=2"
    async with websockets.connect(uri) as ws:
        latencies = []
        for i in range(20):
            t0 = time.perf_counter()
            raw = await ws.recv()
            lat = (time.perf_counter() - t0) * 1000
            latencies.append(lat)
            pkt = json.loads(raw)
            if i == 0:
                phase = pkt["session_phase"]
                level = pkt["hayden_level"]
                f0    = pkt["mic_f0_hz"]
                resp  = pkt["resp_waveform"]
                print(f"  Ilk paket: phase={phase} | L{level} | F0={f0}Hz | resp={resp:.4f}")

        avg  = sum(latencies) / len(latencies)
        maxl = max(latencies)
        print(f"  20 paket latency: ort={avg:.2f}ms | maks={maxl:.2f}ms")

asyncio.run(test())
