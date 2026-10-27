#!/usr/bin/env python3
"""
scripts/test_cric_import.py - Prueba de integración de punta a punta del importador CRIC
sobre Docker Compose (Nginx -> ASP.NET Core API -> PostgreSQL 18 & FastAPI tiles).
"""

import sys
import requests
import json

BASE_URL = "http://localhost:8080"
API_AUTH = f"{BASE_URL}/api/v1/auth"
API_CATALOG = f"{BASE_URL}/api/v1"

def main():
    print("=== Iniciando Verificación de Punta a Punta de Importación CRIC en Docker Compose ===")

    # 1. Login como admin
    login_resp = requests.post(f"{API_AUTH}/login", json={"username": "admin", "password": "gia_admin_password_change_me"})
    assert login_resp.status_code in [200, 204], f"Fallo login admin: {login_resp.status_code}"
    admin_cookies = {"gia_session": login_resp.cookies.get("gia_session")}
    print("1. [OK] Admin autenticado correctamente.")

    # 2. Crear proyecto y dataset dedicado para la prueba de importación
    p_resp = requests.post(f"{API_CATALOG}/projects", json={"name": "Proyecto CRIC E2E", "description": "Pruebas Dia 8"}, cookies=admin_cookies)
    if p_resp.status_code == 201:
        project_id = p_resp.json()["id"]
    else:
        # Ya existe
        proj_list = requests.get(f"{API_CATALOG}/projects", cookies=admin_cookies).json()["items"]
        project_id = [p["id"] for p in proj_list if p["name"] == "Proyecto CRIC E2E"][0]

    ds_name = f"Dataset CRIC Import Test {int(requests.get(f'{API_CATALOG}/projects', cookies=admin_cookies).elapsed.total_seconds() * 1000)}"
    d_resp = requests.post(f"{API_CATALOG}/projects/{project_id}/datasets", json={"name": ds_name, "description": "Dataset para importacion"}, cookies=admin_cookies)
    assert d_resp.status_code == 201, f"Error creando dataset: {d_resp.status_code} {d_resp.text}"
    dataset_id = d_resp.json()["id"]
    print(f"2. [OK] Dataset creado: ID {dataset_id} ('{ds_name}').")

    # 3. Importación con dryRun = true (Simulación)
    print("3. Ejecutando POST /imports con dryRun: true...")
    dry_req = {
        "format": "cric",
        "source": "samples/cric/",
        "dryRun": True,
        "options": {
            "boxSize": 100
        }
    }
    dry_resp = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/imports", json=dry_req, cookies=admin_cookies)
    assert dry_resp.status_code == 200, f"Error en dryRun: HTTP {dry_resp.status_code} - {dry_resp.text}"
    dry_report = dry_resp.json()
    assert dry_report["importId"] is None, "importId debe ser null en dryRun"
    assert dry_report["dryRun"] is True
    assert dry_report["images"]["found"] == 1
    assert dry_report["images"]["registered"] == 1
    assert dry_report["classes"]["created"] == 3 # HSIL, LSIL, NILM
    assert dry_report["annotations"]["created"] == 3
    # Verificar advertencia de caja recortada
    clipped_warnings = [w for w in dry_report["warnings"] if w["code"] == "box-clipped"]
    assert len(clipped_warnings) == 1 and clipped_warnings[0]["record"] == "cellId: 124"
    print("   [OK] Reporte dryRun validado exitosamente:")
    print(f"        Imágenes: {dry_report['images']} | Clases: {dry_report['classes']} | Anotaciones: {dry_report['annotations']}")
    print(f"        Advertencia detectada: {clipped_warnings[0]['message']} ({clipped_warnings[0]['record']})")

    # Comprobar que en la BD no se escribió nada
    imgs_check = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/images", cookies=admin_cookies).json()
    assert len(imgs_check.get("items", [])) == 0, "No debe haber imágenes persistidas tras dryRun"
    classes_check = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/classes", cookies=admin_cookies).json()
    assert len(classes_check.get("items", [])) == 0, "No debe haber clases persistidas tras dryRun"
    print("   [OK] Cero modificaciones en base de datos tras dryRun verificadas.")

    # 4. Importación con dryRun = false (Persistencia atómica)
    print("4. Ejecutando POST /imports con dryRun: false...")
    exec_req = dict(dry_req, dryRun=False)
    exec_resp = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/imports", json=exec_req, cookies=admin_cookies)
    assert exec_resp.status_code == 201, f"Error en ejecución de importación: HTTP {exec_resp.status_code} - {exec_resp.text}"
    exec_report = exec_resp.json()
    import_id = exec_report["importId"]
    assert import_id is not None and import_id > 0, "importId debe ser un ID válido"
    assert exec_report["dryRun"] is False
    assert exec_report["annotations"]["created"] == 3
    print(f"   [OK] Importación persistida con éxito: Import ID {import_id}.")

    # 5. Comprobar que los datos quedaron registrados en la base de datos
    imgs_after = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/images", cookies=admin_cookies).json()["items"]
    assert len(imgs_after) == 1
    imported_img = imgs_after[0]
    assert imported_img["storageKey"] == "samples/cric/0001.png"
    assert imported_img["width"] == 1376
    assert imported_img["height"] == 1020
    print(f"   [OK] Imagen registrada: ID {imported_img['id']} ({imported_img['width']}x{imported_img['height']} px).")

    anns_after = requests.get(f"{API_CATALOG}/images/{imported_img['id']}/annotations?author=all", cookies=admin_cookies).json()["items"]
    assert len(anns_after) == 3
    for ann in anns_after:
        assert ann["authorUsername"] == "import-cric"
        assert ann["source"] == "import"
        assert ann["geometry"]["type"] == "rectangle"
    print(f"   [OK] 3 Anotaciones persistidas con autor 'import-cric' y source 'import'.")

    # 6. Comprobar control de re-importación (HTTP 409 already-imported)
    print("5. Verificando control de re-importación (HTTP 409 already-imported)...")
    reimport_resp = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/imports", json=dry_req, cookies=admin_cookies)
    assert reimport_resp.status_code == 409, f"Se esperaba 409, se obtuvo {reimport_resp.status_code}"
    reimport_prob = reimport_resp.json()
    assert reimport_prob["type"] == "urn:gia:problem:already-imported"
    print(f"   [OK] HTTP 409 recibido: {reimport_prob['detail']}")

    # 7. Comprobar exportación a JSON interno de las anotaciones importadas
    print("6. Verificando exportación del dataset importado a JSON interno...")
    export_resp = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=internal&authors=all", cookies=admin_cookies)
    assert export_resp.status_code == 200, f"Error exportando: {export_resp.status_code}"
    export_doc = export_resp.json()
    assert export_doc["format"] == "gia-annotations"
    assert export_doc["formatVersion"] == "1.0"
    authors = export_doc["authors"]
    assert any(a["username"] == "import-cric" and a["kind"] == "import" for a in authors)
    exported_img = export_doc["images"][0]
    assert len(exported_img["annotations"]) == 3
    print("   [OK] Exportación generada correctamente con autor synthetic 'import-cric' (kind: 'import').")

    print("\n=== TODOS LOS CASOS DE IMPORTACIÓN CRIC FUNCIONANDO PERFECTAMENTE EN VIVO ===")

if __name__ == "__main__":
    main()
