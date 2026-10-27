#!/usr/bin/env python3
"""
scripts/bench-tiles.py - Medición automatizada de los escenarios de calidad QS-4 y QS-8.

QS-4 (Fluidez):
  - Apertura en frío (descriptor DZI) <= 1 s.
  - 500 teselas con 8 pedidos concurrentes a través de la pasarela (Nginx auth_request)
    sobre WSI real (CMU-1-JP2K-33005.svs o CMU-1-Small-Region.svs) -> p95 <= 150 ms.

QS-8 (Confidencialidad):
  - Pedidos sin sesión a las teselas y rutas de API devuelven 401 Unauthorized.
  - Rutas que intenten pedir 'label' o 'macro' no entregan imágenes asociadas.
"""

import sys
import time
import random
import concurrent.futures
import requests
import xml.etree.ElementTree as ET

BASE_URL = "http://localhost:8080"
GATEWAY_TILES = f"{BASE_URL}/tiles/v1"
API_AUTH = f"{BASE_URL}/api/v1/auth"
API_CATALOG = f"{BASE_URL}/api/v1"

def check_qs8_confidentiality(session_cookie: str, test_image_id: int):
    print("=== [QS-8] Verificación de Confidencialidad y Protección de Rutas ===")
    
    # 1. Petición sin cookie a una tesela protegida -> debe ser 401
    unauth_resp = requests.get(f"{GATEWAY_TILES}/images/{test_image_id}.dzi")
    print(f"1. GET DZI sin sesión -> HTTP {unauth_resp.status_code}")
    assert unauth_resp.status_code == 401, f"Fallo QS-8: Se esperaba 401 sin sesión, se obtuvo {unauth_resp.status_code}"

    unauth_tile = requests.get(f"{GATEWAY_TILES}/images/{test_image_id}_files/10/0_0.jpeg")
    print(f"2. GET Tesela sin sesión -> HTTP {unauth_tile.status_code}")
    assert unauth_tile.status_code == 401, f"Fallo QS-8: Se esperaba 401 sin sesión, se obtuvo {unauth_tile.status_code}"

    # 2. Petición autenticada para verificar que las imágenes asociadas (macro, label) no se exponen
    cookies = {"gia_session": session_cookie}
    macro_resp = requests.get(f"{GATEWAY_TILES}/images/{test_image_id}/macro", cookies=cookies)
    label_resp = requests.get(f"{GATEWAY_TILES}/images/{test_image_id}/label", cookies=cookies)
    print(f"3. GET /macro -> HTTP {macro_resp.status_code}, GET /label -> HTTP {label_resp.status_code}")
    assert macro_resp.status_code in [404, 400], f"Fallo QS-8: Se expone /macro ({macro_resp.status_code})"
    assert label_resp.status_code in [404, 400], f"Fallo QS-8: Se expone /label ({label_resp.status_code})"
    print("[OK] QS-8 Cumplido: Proteccion por auth_request verificada y sin filtracion de imagenes asociadas.\n")

def run_qs4_benchmark(session_cookie: str, test_image_id: int):
    print("=== [QS-4] Medición de Fluidez y Rendimiento de Teselas WSI ===")
    cookies = {"gia_session": session_cookie}

    # 1. Apertura en frío (DZI)
    t0 = time.perf_counter()
    dzi_resp = requests.get(f"{GATEWAY_TILES}/images/{test_image_id}.dzi", cookies=cookies)
    cold_open_ms = (time.perf_counter() - t0) * 1000
    assert dzi_resp.status_code == 200, f"Error obteniendo DZI: HTTP {dzi_resp.status_code}"
    print(f"1. Apertura en frío (GET {test_image_id}.dzi): {cold_open_ms:.2f} ms")
    assert cold_open_ms <= 1000, f"Fallo QS-4: Apertura en frío superó 1.000 ms ({cold_open_ms:.2f} ms)"

    # Parsear XML DZI para conocer niveles y dimensiones
    root = ET.fromstring(dzi_resp.text)
    xmlns = "{http://schemas.microsoft.com/deepzoom/2008}"
    size_elem = root.find(f"{xmlns}Size")
    width = int(size_elem.attrib["Width"])
    height = int(size_elem.attrib["Height"])
    tile_size = int(root.attrib.get("TileSize", "256"))
    print(f"   Dimensiones nivel 0: {width} x {height} px | TileSize: {tile_size} px")

    # 2. Generar lista de 500 pedidos aleatorios de teselas
    # Nivel máximo típico en DZI = ceil(log2(max(width, height)))
    import math
    max_level = math.ceil(math.log2(max(width, height)))
    
    tile_urls = []
    # Concentrar pedidos en niveles medios y profundos (zoom real de navegación)
    test_levels = [max_level, max_level - 1, max_level - 2]
    for _ in range(500):
        lvl = random.choice(test_levels)
        scale = 2 ** (lvl - max_level)
        lvl_w = max(1, int(width * scale))
        lvl_h = max(1, int(height * scale))
        cols = max(1, math.ceil(lvl_w / tile_size))
        rows = max(1, math.ceil(lvl_h / tile_size))
        col = random.randint(0, cols - 1)
        row = random.randint(0, rows - 1)
        tile_urls.append(f"{GATEWAY_TILES}/images/{test_image_id}_files/{lvl}/{col}_{row}.jpeg")

    print(f"2. Ejecutando 500 peticiones de teselas con 8 workers concurrentes...")
    latencies_ms = []

    def fetch_tile(url):
        start = time.perf_counter()
        r = requests.get(url, cookies=cookies)
        latency = (time.perf_counter() - start) * 1000
        return r.status_code, latency

    bench_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(fetch_tile, tile_urls))
    bench_duration = time.perf_counter() - bench_start

    for status, lat in results:
        assert status == 200, f"Error en tesela HTTP {status}"
        latencies_ms.append(lat)

    latencies_ms.sort()
    p50 = latencies_ms[int(len(latencies_ms) * 0.50)]
    p90 = latencies_ms[int(len(latencies_ms) * 0.90)]
    p95 = latencies_ms[int(len(latencies_ms) * 0.95)]
    p99 = latencies_ms[int(len(latencies_ms) * 0.99)]
    avg = sum(latencies_ms) / len(latencies_ms)
    throughput = len(latencies_ms) / bench_duration

    print(f"   Duración total: {bench_duration:.2f} s | Throughput: {throughput:.1f} teselas/seg")
    print(f"   Latencias:")
    print(f"     Promedio: {avg:.2f} ms")
    print(f"     p50:      {p50:.2f} ms")
    print(f"     p90:      {p90:.2f} ms")
    print(f"     p95:      {p95:.2f} ms (Objetivo QS-4 <= 150 ms)")
    print(f"     p99:      {p99:.2f} ms")

    assert p95 <= 150.0, f"Fallo QS-4: p95 ({p95:.2f} ms) superó el límite de 150 ms"
    print("[OK] QS-4 Cumplido: Latencia p95 <= 150 ms alcanzada satisfactoriamente.\n")

def main():
    print("Iniciando suite de benchmarks QS-4 y QS-8 sobre Docker Compose...\n")
    target_image_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    # 1. Login como admin
    login_resp = requests.post(
        f"{API_AUTH}/login",
        json={"username": "admin", "password": "gia_admin_password_change_me"}
    )
    if login_resp.status_code not in [200, 204]:
        print(f"Error autenticando admin: HTTP {login_resp.status_code} - {login_resp.text}")
        sys.exit(1)

    session_cookie = login_resp.cookies.get("gia_session")
    if not session_cookie:
        print("No se recibió la cookie gia_session en la respuesta de login.")
        sys.exit(1)

    # 2. Obtener datasets e imágenes disponibles
    cookies = {"gia_session": session_cookie}
    proj_resp = requests.get(f"{API_CATALOG}/projects", cookies=cookies)
    projects = proj_resp.json().get("items", [])
    if not projects:
        print("No hay proyectos cargados. Creando proyecto de prueba...")
        p_res = requests.post(f"{API_CATALOG}/projects", json={"name": "Benchmark Project"}, cookies=cookies)
        project_id = p_res.json()["id"]
    else:
        project_id = projects[0]["id"]

    ds_resp = requests.get(f"{API_CATALOG}/projects/{project_id}/datasets", cookies=cookies)
    datasets = ds_resp.json().get("items", [])
    if not datasets:
        print("No hay datasets. Creando dataset de benchmark...")
        d_res = requests.post(f"{API_CATALOG}/projects/{project_id}/datasets", json={"name": "Benchmark Dataset"}, cookies=cookies)
        dataset_id = d_res.json()["id"]
    else:
        dataset_id = datasets[0]["id"]

    imgs_resp = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/images", cookies=cookies)
    images = imgs_resp.json().get("items", [])
    
    if target_image_id:
        test_image_id = target_image_id
    else:
        test_image_id = None
        for img in images:
            if img.get("format") == "svs" or img.get("kind") == "wsi":
                test_image_id = img["id"]
                break

    if not test_image_id and images:
        test_image_id = images[0]["id"]

    if not test_image_id:
        # Registrar una imagen de muestra
        print("Registrando imagen para benchmark...")
        reg_resp = requests.post(
            f"{API_CATALOG}/datasets/{dataset_id}/images",
            json={"storageKeys": ["samples/CMU-1-Small-Region.svs"]},
            cookies=cookies
        )
        if reg_resp.status_code == 201:
            test_image_id = reg_resp.json()[0]["id"]
        elif reg_resp.status_code == 409:
            imgs_resp = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/images", cookies=cookies)
            test_image_id = imgs_resp.json().get("items", [])[0]["id"]

    print(f"Utilizando imagen ID {test_image_id} para benchmark.\n")
    check_qs8_confidentiality(session_cookie, test_image_id)
    run_qs4_benchmark(session_cookie, test_image_id)
    print("=== TODOS LOS ESCENARIOS DE CALIDAD (QS-4 Y QS-8) VERIFICADOS CON ÉXITO ===")

if __name__ == "__main__":
    main()
