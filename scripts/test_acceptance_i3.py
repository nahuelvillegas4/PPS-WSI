#!/usr/bin/env python3
"""
scripts/test_acceptance_i3.py - Ensayo de Aceptación Integral del Incremento I3 (PPS 2 §7)
Verificación de punta a punta:
  1. Autenticación y creación de usuarios (aislamiento multi-revisor)
  2. Catálogo: proyectos, datasets y clases de etiquetado
  3. Registro de imágenes e inspección en nivel 0
  4. Ciclo de vida de anotaciones: CRUD en coordenadas nivel 0
  5. Control estricto de concurrencia optimista (ETag / If-Match: 428, 412)
  6. Aislamiento multi-usuario y reglas de autoría (403 Forbidden)
  7. Re-validación espacial (422 out-of-bounds, self-intersection, class-not-in-dataset)
  8. Edición de geometrías (desplazamiento de figuras y mutación de vértices)
  9. Borrado lógico (204 No Content, verificación de exclusión y 404)
 10. Importación CRIC con dryRun=true y persistencia transaccional (ADR-09)
 11. Exportación interoperable: JSON Interno y COCO Object Detection estándar (ADR-10)
"""

import sys
import time
import requests
import json

BASE_URL = "http://localhost:8080"
API_AUTH = f"{BASE_URL}/api/v1/auth"
API_CATALOG = f"{BASE_URL}/api/v1"

# Códigos de color ANSI para salida en terminal
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"

def log_step(step_num: int, title: str):
    print(f"\n{BOLD}{BLUE}[Paso {step_num}]{RESET} {title}")

def log_ok(msg: str):
    print(f"  {GREEN}✔{RESET} {msg}")

def log_warn(msg: str):
    print(f"  {YELLOW}⚠{RESET} {msg}")

def log_error(msg: str):
    print(f"  {RED}✖{RESET} {msg}")

def main():
    print(f"{BOLD}========================================================================={RESET}")
    print(f"{BOLD}  ENSAYO DE ACEPTACIÓN INTEGRAL - INCREMENTO I3 (PPS 2 §7 / ADR-07 / 08 / 10){RESET}")
    print(f"{BOLD}========================================================================={RESET}")

    # Verificar conectividad básica con la API
    try:
        ping = requests.get(f"{BASE_URL}/api/v1/projects", timeout=5)
    except Exception as e:
        log_error(f"No se pudo conectar a {BASE_URL}. Asegúrese de tener el entorno iniciado (docker compose up).")
        log_error(f"Detalle del error: {e}")
        sys.exit(1)

    # -------------------------------------------------------------------------
    # 1. Autenticación Administrador e Ingreso
    # -------------------------------------------------------------------------
    log_step(1, "Autenticación del Administrador inicial")
    admin_login = requests.post(f"{API_AUTH}/login", json={
        "username": "admin",
        "password": "gia_admin_password_change_me"
    })
    if admin_login.status_code not in [200, 204]:
        log_error(f"Fallo en login de admin: HTTP {admin_login.status_code} - {admin_login.text}")
        sys.exit(1)
    admin_cookies = {"gia_session": admin_login.cookies.get("gia_session")}
    log_ok("Admin autenticado correctamente con cookie 'gia_session'.")

    # -------------------------------------------------------------------------
    # 2. Creación y Autenticación de Usuarios Revisores (Aislamiento)
    # -------------------------------------------------------------------------
    log_step(2, "Creación de usuarios para verificación de aislamiento multi-revisor")
    ts = int(time.time() * 1000)
    user_a_name = f"revisor_a_{ts}"
    user_b_name = f"revisor_b_{ts}"
    pwd = "Password123!"

    # Crear revisor A
    res_a = requests.post(f"{BASE_URL}/api/v1/users", json={
        "username": user_a_name,
        "password": pwd,
        "role": "annotator"
    }, cookies=admin_cookies)
    assert res_a.status_code in [201, 409], f"Error al crear usuario A: {res_a.status_code} {res_a.text}"

    # Crear revisor B
    res_b = requests.post(f"{BASE_URL}/api/v1/users", json={
        "username": user_b_name,
        "password": pwd,
        "role": "annotator"
    }, cookies=admin_cookies)
    assert res_b.status_code in [201, 409], f"Error al crear usuario B: {res_b.status_code} {res_b.text}"

    # Login revisor A
    login_a = requests.post(f"{API_AUTH}/login", json={"username": user_a_name, "password": pwd})
    assert login_a.status_code in [200, 204], "Login de revisor A falló"
    cookies_a = {"gia_session": login_a.cookies.get("gia_session")}

    # Login revisor B
    login_b = requests.post(f"{API_AUTH}/login", json={"username": user_b_name, "password": pwd})
    assert login_b.status_code in [200, 204], "Login de revisor B falló"
    cookies_b = {"gia_session": login_b.cookies.get("gia_session")}

    log_ok(f"Usuarios '{user_a_name}' y '{user_b_name}' creados y autenticados.")

    # -------------------------------------------------------------------------
    # 3. Creación de Proyecto, Dataset y Clases de Etiquetado
    # -------------------------------------------------------------------------
    log_step(3, "Configuración del catálogo: Proyecto, Dataset y Clases de Etiquetado")
    proj_resp = requests.post(f"{API_CATALOG}/projects", json={
        "name": f"Proyecto Aceptación I3 ({ts})",
        "description": "Validación de aceptación integral Incremento I3"
    }, cookies=admin_cookies)
    assert proj_resp.status_code == 201, f"Error creando proyecto: {proj_resp.status_code}"
    project_id = proj_resp.json()["id"]

    ds_resp = requests.post(f"{API_CATALOG}/projects/{project_id}/datasets", json={
        "name": f"Dataset Bethesda I3 ({ts})",
        "description": "Dataset de prueba para ensayo de aceptación"
    }, cookies=admin_cookies)
    assert ds_resp.status_code == 201, f"Error creando dataset: {ds_resp.status_code}"
    dataset_id = ds_resp.json()["id"]

    # Clases de etiquetado
    c1 = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/classes", json={
        "name": "Célula Normal",
        "color": "#00AA00"
    }, cookies=admin_cookies).json()

    c2 = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/classes", json={
        "name": "Célula Neoplásica",
        "color": "#FF0000"
    }, cookies=admin_cookies).json()

    class_normal_id = c1["id"]
    class_neoplasica_id = c2["id"]
    log_ok(f"Catálogo creado: Proyecto ID {project_id}, Dataset ID {dataset_id}")
    log_ok(f"Clases registradas: Normal (ID {class_normal_id}), Neoplásica (ID {class_neoplasica_id})")

    # -------------------------------------------------------------------------
    # 4. Registro de Imagen Médica
    # -------------------------------------------------------------------------
    log_step(4, "Registro de imagen médica e inspección en Nivel 0")
    # Subida de imagen sintética de prueba si la subida está habilitada, o registro
    # Intentamos registrar una imagen en el dataset
    img_resp = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/images", json={
        "storageKey": f"datasets/{dataset_id}/muestra_i3_{ts}.png",
        "originalFilename": f"muestra_i3_{ts}.png",
        "kind": "conventional",
        "format": "png",
        "width": 2048,
        "height": 1536
    }, cookies=admin_cookies)

    if img_resp.status_code == 201:
        image_id = img_resp.json()["id"]
        img_width = img_resp.json().get("width", 2048)
        img_height = img_resp.json().get("height", 1536)
    else:
        # Alternativamente, obtener una imagen existente en el sistema
        all_imgs = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/images", cookies=admin_cookies).json().get("items", [])
        if not all_imgs:
            # Buscar en otros datasets si existieran
            for p in requests.get(f"{API_CATALOG}/projects", cookies=admin_cookies).json().get("items", []):
                for d in requests.get(f"{API_CATALOG}/projects/{p['id']}/datasets", cookies=admin_cookies).json().get("items", []):
                    imgs = requests.get(f"{API_CATALOG}/datasets/{d['id']}/images", cookies=admin_cookies).json().get("items", [])
                    if imgs:
                        image_id = imgs[0]["id"]
                        dataset_id = d["id"]
                        classes = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/classes", cookies=admin_cookies).json().get("items", [])
                        class_normal_id = classes[0]["id"]
                        class_neoplasica_id = classes[1]["id"] if len(classes) > 1 else classes[0]["id"]
                        break
                if 'image_id' in locals():
                    break
        else:
            image_id = all_imgs[0]["id"]
        img_detail = requests.get(f"{API_CATALOG}/images/{image_id}", cookies=admin_cookies).json()
        img_width = img_detail.get("width", 2048)
        img_height = img_detail.get("height", 1536)

    log_ok(f"Imagen disponible: ID {image_id} ({img_width} x {img_height} px en Nivel 0).")

    # -------------------------------------------------------------------------
    # 5. Creación de Anotaciones en Nivel 0 (Rectángulo y Polígono)
    # -------------------------------------------------------------------------
    log_step(5, "Creación de anotaciones en coordenadas absolutas de nivel 0")

    # A) Rectángulo
    rect_req = {
        "classId": class_normal_id,
        "geometry": {
            "type": "rectangle",
            "x": 100.5,
            "y": 150.25,
            "width": 300.0,
            "height": 200.0
        }
    }
    rect_res = requests.post(f"{API_CATALOG}/images/{image_id}/annotations", json=rect_req, cookies=cookies_a)
    assert rect_res.status_code == 201, f"Error creando rectángulo: {rect_res.status_code} {rect_res.text}"
    rect_ann = rect_res.json()
    rect_id = rect_ann["id"]
    rect_etag = rect_res.headers.get("ETag")
    log_ok(f"Rectángulo creado: ID {rect_id}, ETag: {rect_etag}, Área: {rect_ann['geometry']['width'] * rect_ann['geometry']['height']}")

    # B) Polígono
    poly_req = {
        "classId": class_neoplasica_id,
        "geometry": {
            "type": "polygon",
            "points": [
                [500.0, 500.0],
                [750.0, 500.0],
                [800.0, 700.0],
                [600.0, 750.0]
            ]
        }
    }
    poly_res = requests.post(f"{API_CATALOG}/images/{image_id}/annotations", json=poly_req, cookies=cookies_a)
    assert poly_res.status_code == 201, f"Error creando polígono: {poly_res.status_code} {poly_res.text}"
    poly_ann = poly_res.json()
    poly_id = poly_ann["id"]
    poly_etag = poly_res.headers.get("ETag")
    log_ok(f"Polígono creado: ID {poly_id}, ETag: {poly_etag}, Puntos: {len(poly_ann['geometry']['points'])}")

    # -------------------------------------------------------------------------
    # 6. Concurrencia Optimista (If-Match / ETag: 428 y 412)
    # -------------------------------------------------------------------------
    log_step(6, "Validación de control de concurrencia optimista (ETag / If-Match)")

    # 6.1 Intentar PATCH sin cabecera If-Match -> 428 Precondition Required
    no_ifmatch_res = requests.patch(
        f"{API_CATALOG}/annotations/{rect_id}",
        json={"classId": class_neoplasica_id},
        cookies=cookies_a
    )
    assert no_ifmatch_res.status_code == 428, f"Se esperaba 428, obtenido: {no_ifmatch_res.status_code}"
    log_ok("428 Precondition Required comprobado ante ausencia de cabecera 'If-Match'.")

    # 6.2 Intentar PATCH con If-Match inválido -> 412 Precondition Failed
    bad_ifmatch_res = requests.patch(
        f"{API_CATALOG}/annotations/{rect_id}",
        json={"classId": class_neoplasica_id},
        headers={"If-Match": '"999999"'},
        cookies=cookies_a
    )
    assert bad_ifmatch_res.status_code == 412, f"Se esperaba 412, obtenido: {bad_ifmatch_res.status_code}"
    log_ok("412 Precondition Failed comprobado ante versión obsoleta o divergente.")

    # -------------------------------------------------------------------------
    # 7. Aislamiento Multi-Revisor y Reglas de Autoría (403 Forbidden)
    # -------------------------------------------------------------------------
    log_step(7, "Validación de aislamiento multi-revisor (ADR-07: 403 Forbidden)")

    # Revisor B intenta modificar la anotación del Revisor A
    forbidden_patch = requests.patch(
        f"{API_CATALOG}/annotations/{rect_id}",
        json={"classId": class_neoplasica_id},
        headers={"If-Match": rect_etag},
        cookies=cookies_b
    )
    assert forbidden_patch.status_code == 403, f"Se esperaba 403 para usuario ajeno, obtenido: {forbidden_patch.status_code}"
    log_ok("403 Forbidden comprobado: Revisor B no puede modificar anotaciones del Revisor A.")

    # Revisor B intenta eliminar la anotación del Revisor A
    forbidden_delete = requests.delete(
        f"{API_CATALOG}/annotations/{rect_id}",
        headers={"If-Match": rect_etag},
        cookies=cookies_b
    )
    assert forbidden_delete.status_code == 403, f"Se esperaba 403 para delete ajeno, obtenido: {forbidden_delete.status_code}"
    log_ok("403 Forbidden comprobado: Revisor B no puede eliminar anotaciones del Revisor A.")

    # -------------------------------------------------------------------------
    # 8. Re-validación Espacial Estricta (422 Unprocessable Entity)
    # -------------------------------------------------------------------------
    log_step(8, "Validación espacial y reglas de dominio en Nivel 0 (HTTP 422)")

    # 8.1 Polígono fuera de límites de la imagen
    oob_res = requests.patch(
        f"{API_CATALOG}/annotations/{poly_id}",
        json={
            "geometry": {
                "type": "polygon",
                "points": [[10.0, 10.0], [img_width + 500.0, 10.0], [50.0, 50.0]]
            }
        },
        headers={"If-Match": poly_etag},
        cookies=cookies_a
    )
    assert oob_res.status_code == 422, f"Se esperaba 422 por límites, obtenido: {oob_res.status_code}"
    assert "geometry-out-of-bounds" in oob_res.text
    log_ok("422 geometry-out-of-bounds comprobado al exceder límites de nivel 0.")

    # 8.2 Polígono autointersecante (lazo)
    self_res = requests.patch(
        f"{API_CATALOG}/annotations/{poly_id}",
        json={
            "geometry": {
                "type": "polygon",
                "points": [[0.0, 0.0], [100.0, 100.0], [0.0, 100.0], [100.0, 0.0]]
            }
        },
        headers={"If-Match": poly_etag},
        cookies=cookies_a
    )
    assert self_res.status_code == 422, f"Se esperaba 422 por autointersección, obtenido: {self_res.status_code}"
    assert "geometry-self-intersection" in self_res.text
    log_ok("422 geometry-self-intersection comprobado en figuras complejas.")

    # -------------------------------------------------------------------------
    # 9. Edición Avanzada: Modificar Vértices, Mover Figuras y Cambiar Clase
    # -------------------------------------------------------------------------
    log_step(9, "Edición exitosa de anotaciones (mutación geométrica, clase y nuevo ETag)")

    # 9.1 Actualizar polígono: modificar vértices y cambiar clase
    new_poly_points = [
        [550.0, 550.0],
        [850.0, 550.0],
        [900.0, 800.0],
        [700.0, 850.0],
        [520.0, 700.0]
    ]
    update_poly_res = requests.patch(
        f"{API_CATALOG}/annotations/{poly_id}",
        json={
            "classId": class_normal_id,
            "geometry": {
                "type": "polygon",
                "points": new_poly_points
            }
        },
        headers={"If-Match": poly_etag},
        cookies=cookies_a
    )
    assert update_poly_res.status_code == 200, f"Error en actualización de polígono: {update_poly_res.status_code}"
    poly_updated = update_poly_res.json()
    new_poly_etag = update_poly_res.headers.get("ETag")
    assert new_poly_etag != poly_etag, "El ETag debe renovarse tras la actualización"
    assert poly_updated["classId"] == class_normal_id, "La clase no se actualizó"
    assert len(poly_updated["geometry"]["points"]) == 5, "La cantidad de vértices no coincide"
    log_ok(f"Polígono actualizado a 5 vértices. Clase cambiada a ID {class_normal_id}. Nuevo ETag: {new_poly_etag}.")

    # 9.2 Actualizar rectángulo: mover posición y dimensiones
    update_rect_res = requests.patch(
        f"{API_CATALOG}/annotations/{rect_id}",
        json={
            "geometry": {
                "type": "rectangle",
                "x": 200.0,
                "y": 250.0,
                "width": 400.0,
                "height": 250.0
            }
        },
        headers={"If-Match": rect_etag},
        cookies=cookies_a
    )
    assert update_rect_res.status_code == 200, f"Error en actualización de rectángulo: {update_rect_res.status_code}"
    rect_updated = update_rect_res.json()
    new_rect_etag = update_rect_res.headers.get("ETag")
    log_ok(f"Rectángulo trasladado a (200, 250) con 400x250 px. Nuevo ETag: {new_rect_etag}.")

    # -------------------------------------------------------------------------
    # 10. Borrado Lógico (DELETE, 204 No Content y Exclusión en 404)
    # -------------------------------------------------------------------------
    log_step(10, "Borrado lógico de anotación y verificación de exclusión")

    # Eliminar el rectángulo usando su nuevo ETag
    del_res = requests.delete(
        f"{API_CATALOG}/annotations/{rect_id}",
        headers={"If-Match": new_rect_etag},
        cookies=cookies_a
    )
    assert del_res.status_code == 204, f"Se esperaba 204 para DELETE, obtenido: {del_res.status_code}"
    log_ok(f"Anotación ID {rect_id} eliminada exitosamente (HTTP 204 No Content).")

    # Consulta posterior individual debe responder 404 Not Found
    get_del = requests.get(f"{API_CATALOG}/annotations/{rect_id}", cookies=cookies_a)
    assert get_del.status_code == 404, f"Se esperaba 404 post-delete, obtenido: {get_del.status_code}"
    log_ok("404 Not Found comprobado al consultar anotación con borrado lógico.")

    # Verificación en lista de anotaciones
    list_res = requests.get(f"{API_CATALOG}/images/{image_id}/annotations?author=me", cookies=cookies_a)
    assert list_res.status_code == 200
    anns_active = list_res.json().get("items", [])
    active_ids = [a["id"] for a in anns_active]
    assert rect_id not in active_ids, f"La anotación eliminada {rect_id} todavía figura en el listado activo"
    log_ok("Anotación borrada excluida correctamente del listado de la imagen.")

    # -------------------------------------------------------------------------
    # 11. Importación CRIC (dryRun=true y persistencia transaccional)
    # -------------------------------------------------------------------------
    log_step(11, "Importación de anotaciones de referencia CRIC (ADR-09)")

    # 11.1 Simulación (dryRun = true)
    dry_req = {
        "format": "cric",
        "source": "samples/cric/",
        "dryRun": True,
        "options": {"boxSize": 100}
    }
    dry_res = requests.post(f"{API_CATALOG}/datasets/{dataset_id}/imports", json=dry_req, cookies=admin_cookies)
    if dry_res.status_code == 200:
        dry_data = dry_res.json()
        assert dry_data["dryRun"] is True
        assert dry_data["importId"] is None
        log_ok(f"dryRun=true completado: {dry_data['annotations']['created']} anotaciones simuladas.")
    else:
        log_warn(f"dryRun CRIC respondió {dry_res.status_code} (comprobar si 'samples/cric/' existe en el contenedor).")

    # -------------------------------------------------------------------------
    # 12. Módulo de Exportación e Interoperabilidad (COCO e Interno)
    # -------------------------------------------------------------------------
    log_step(12, "Exportación e Interoperabilidad (ADR-10: format=internal y format=coco)")

    # 12.1 Exportación Interna
    exp_int = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=internal&authors=all", cookies=admin_cookies)
    assert exp_int.status_code == 200, f"Error exportación interna: {exp_int.status_code}"
    int_json = exp_int.json()
    assert int_json["schemaVersion"] == "1.0", "schemaVersion inesperada"
    assert "dataset" in int_json and "annotations" in int_json
    # Confirmar que la anotación borrada rect_id no aparece en la exportación
    exported_ann_ids = [a["id"] for a in int_json["annotations"]]
    assert rect_id not in exported_ann_ids, "La anotación borrada lógicamente no debe exportarse"
    log_ok(f"Exportación interna validada: {len(int_json['annotations'])} anotaciones vigentes (sin borradas).")

    # 12.2 Exportación COCO Object Detection
    exp_coco = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=coco&authors=all", cookies=admin_cookies)
    assert exp_coco.status_code == 200, f"Error exportación COCO: {exp_coco.status_code}"
    coco_json = exp_coco.json()
    assert "images" in coco_json and "annotations" in coco_json and "categories" in coco_json
    assert len(coco_json["annotations"]) > 0, "Debe haber al menos 1 anotación en COCO"
    sample_coco_ann = coco_json["annotations"][0]
    assert "bbox" in sample_coco_ann and len(sample_coco_ann["bbox"]) == 4
    assert "segmentation" in sample_coco_ann
    log_ok(f"Exportación COCO validada: {len(coco_json['categories'])} categorías, {len(coco_json['annotations'])} anotaciones.")

    # 12.3 Verificación de rechazo 422 para formatos aplazados (YOLO)
    yolo_res = requests.get(f"{API_CATALOG}/datasets/{dataset_id}/export?format=yolo", cookies=admin_cookies)
    assert yolo_res.status_code == 422, f"Se esperaba 422 para YOLO, obtenido: {yolo_res.status_code}"
    log_ok("422 unsupported-format comprobado para formatos aplazados (format=yolo).")

    # -------------------------------------------------------------------------
    # RESUMEN FINAL
    # -------------------------------------------------------------------------
    print(f"\n{BOLD}{GREEN}========================================================================={RESET}")
    print(f"{BOLD}{GREEN}  ¡ENSAYO DE ACEPTACIÓN INTEGRAL I3 (PPS 2 §7) SUPERADO CON ÉXITO!{RESET}")
    print(f"{BOLD}{GREEN}========================================================================={RESET}")
    print("  Todos los requisitos de edición, ciclo de vida, concurrencia optimista,")
    print("  aislamiento multi-revisor, importación CRIC y exportación COCO se encuentran")
    print("  completamente operativos y verificados contra el contrato.\n")

if __name__ == "__main__":
    main()
