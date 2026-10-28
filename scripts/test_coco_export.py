#!/usr/bin/env python3
"""
scripts/test_coco_export.py - Prueba de integración del exportador COCO (ADR-10, Épica E9)
sobre Docker Compose (Nginx -> ASP.NET Core API -> PostgreSQL 18).
"""

import sys
import requests
import json

BASE_URL = "http://localhost:8080"
API_AUTH = f"{BASE_URL}/api/v1/auth"
API_CATALOG = f"{BASE_URL}/api/v1"

def main():
    print("=== Iniciando Verificación de Exportación COCO en Docker Compose ===")

    # 1. Login como admin
    login_resp = requests.post(f"{API_AUTH}/login", json={"username": "admin", "password": "gia_admin_password_change_me"})
    if login_resp.status_code not in [200, 204]:
        print(f"Error login admin: {login_resp.status_code}")
        sys.exit(1)
    admin_cookies = {"gia_session": login_resp.cookies.get("gia_session")}
    print("1. [OK] Admin autenticado correctamente.")

    # 2. Obtener un dataset con imágenes o crear uno de prueba
    proj_resp = requests.get(f"{API_CATALOG}/projects", cookies=admin_cookies)
    assert proj_resp.status_code == 200
    projects = proj_resp.json().get("items", [])
    if not projects:
        p_create = requests.post(f"{API_CATALOG}/projects", json={"name": "Proyecto COCO Test", "description": "COCO export"}, cookies=admin_cookies)
        project_id = p_create.json()["id"]
    else:
        project_id = projects[0]["id"]

    ds_resp = requests.get(f"{API_CATALOG}/projects/{project_id}/datasets", cookies=admin_cookies)
    datasets = ds_resp.json().get("items", [])
    if not datasets:
        d_create = requests.post(f"{API_CATALOG}/projects/{project_id}/datasets", json={"name": "Dataset COCO Test", "description": "Pruebas COCO"}, cookies=admin_cookies)
        dataset_id = d_create.json()["id"]
    else:
        dataset_id = datasets[0]["id"]

    print(f"2. [OK] Utilizando Dataset ID {dataset_id}.")

    # 3. Validar exportación con format=coco
    export_resp = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=coco&authors=all", cookies=admin_cookies)
    assert export_resp.status_code == 200, f"Fallo exportación COCO: {export_resp.status_code} - {export_resp.text}"
    content_disp = export_resp.headers.get("Content-Disposition", "")
    assert "attachment" in content_disp and "-coco.json" in content_disp, f"Content-Disposition inesperado: {content_disp}"
    print(f"3. [OK] Descarga exitosa con Content-Disposition: {content_disp}")

    # 4. Validar contenido JSON COCO
    coco_json = export_resp.json()
    assert "info" in coco_json, "Falta bloque 'info' en COCO"
    assert "licenses" in coco_json, "Falta bloque 'licenses' en COCO"
    assert "images" in coco_json, "Falta bloque 'images' en COCO"
    assert "annotations" in coco_json, "Falta bloque 'annotations' en COCO"
    assert "categories" in coco_json, "Falta bloque 'categories' en COCO"

    print("4. [OK] Estructura COCO estándar validada:")
    print(f"   - Info: {coco_json['info']['description']} (v{coco_json['info']['version']})")
    print(f"   - Categorías: {len(coco_json['categories'])}")
    print(f"   - Imágenes: {len(coco_json['images'])}")
    print(f"   - Anotaciones: {len(coco_json['annotations'])}")

    # 5. Validar rechazo de format=yolo con 422
    yolo_resp = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=yolo", cookies=admin_cookies)
    assert yolo_resp.status_code == 422, f"Se esperaba 422 para YOLO, obtenido: {yolo_resp.status_code}"
    assert "unsupported-format" in yolo_resp.text
    print("5. [OK] Rechazo contractual 422 para format=yolo comprobado.")

    print("\n=== Todos los checks de Exportación COCO completados exitosamente ===")

if __name__ == "__main__":
    main()
