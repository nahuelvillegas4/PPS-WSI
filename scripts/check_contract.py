#!/usr/bin/env python3
"""Verifica el contrato de integración (/contract). Lo corre la CI en cada PR.

Qué comprueba:
  1. Los JSON Schema son válidos (draft 2020-12).
  2. geometry-validation.json: los casos válidos y los 422 cumplen el esquema; los 400 no.
     Además ejecuta una implementación de referencia de las reglas 422 (la API de .NET debe
     producir el mismo resultado para los mismos casos).
  3. coordinates.json: recalcula pantalla → nivel 0 y el ida y vuelta del rectángulo.
  4. export.json: recalcula COCO, YOLO y la conversión punto → caja de CRIC; valida el ejemplo
     de exportación interna contra su esquema.
  5. dzi.json: recalcula con openslide.deepzoom.DeepZoomGenerator si está instalado.
  6. Las especificaciones OpenAPI son válidas (si openapi-spec-validator está instalado).

Uso:  python scripts/check_contract.py            (sale con código 1 si algo falla)
"""
from __future__ import annotations

import copy
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1] / "contract"
SCHEMAS = ROOT / "schemas"
FIXTURES = ROOT / "fixtures"
failures: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        failures.append(msg)


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


# ---------------------------------------------------------------- 1. esquemas
def schema_with_id(name: str) -> dict:
    s = copy.deepcopy(load(SCHEMAS / name))
    s["$id"] = (SCHEMAS / name).as_uri()
    return s


geometry_schema = schema_with_id("geometry.schema.json")
export_schema = schema_with_id("internal-export.schema.json")
for s in (geometry_schema, export_schema):
    Draft202012Validator.check_schema(s)
registry = Registry().with_resources(
    [(s["$id"], Resource.from_contents(s)) for s in (geometry_schema, export_schema)]
)
geometry_validator = Draft202012Validator(geometry_schema, registry=registry)
export_validator = Draft202012Validator(export_schema, registry=registry)


# ------------------------------------------------ 2. reglas de dominio (422)
def area2(points) -> float:
    """Doble del área con signo (fórmula del cordón de zapato)."""
    return sum(points[i][0] * points[(i + 1) % len(points)][1]
               - points[(i + 1) % len(points)][0] * points[i][1] for i in range(len(points)))


def orient(a, b, c) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def on_segment(a, b, p) -> bool:
    return min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])


def segments_intersect(p1, p2, p3, p4) -> bool:
    d1, d2, d3, d4 = orient(p3, p4, p1), orient(p3, p4, p2), orient(p1, p2, p3), orient(p1, p2, p4)
    if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)) and 0 not in (d1, d2, d3, d4):
        return True
    return ((d1 == 0 and on_segment(p3, p4, p1)) or (d2 == 0 and on_segment(p3, p4, p2))
            or (d3 == 0 and on_segment(p1, p2, p3)) or (d4 == 0 and on_segment(p1, p2, p4)))


def domain_problem(geom: dict, width: float, height: float) -> str | None:
    """Implementación de referencia de las reglas 422 del contrato v0.1.

    Orden de evaluación (fijo): límites → cierre explícito y vértices repetidos → autointersección → área nula.
    """
    if geom["type"] == "rectangle":
        if geom["x"] + geom["width"] > width or geom["y"] + geom["height"] > height:
            return "urn:gia:problem:geometry-out-of-bounds"
        return None
    pts = geom["points"]
    if any(x > width or y > height for x, y in pts):
        return "urn:gia:problem:geometry-out-of-bounds"
    if pts[0] == pts[-1] or any(pts[i] == pts[i + 1] for i in range(len(pts) - 1)):
        return "urn:gia:problem:geometry-degenerate"
    n = len(pts)
    for i in range(n):
        for j in range(i + 1, n):
            if j == i + 1 or (i == 0 and j == n - 1):
                continue  # aristas adyacentes comparten un vértice
            if segments_intersect(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]):
                return "urn:gia:problem:geometry-self-intersection"
    if abs(area2(pts)) < 1e-9:  # después de la autointersección: un moño simétrico tiene área con signo 0
        return "urn:gia:problem:geometry-degenerate"
    return None


gv = load(FIXTURES / "geometry-validation.json")
W, H = gv["image"]["width"], gv["image"]["height"]
for case in gv["valid"]:
    check(geometry_validator.is_valid(case["geometry"]), f"{case['id']}: debería cumplir el esquema")
    check(domain_problem(case["geometry"], W, H) is None, f"{case['id']}: no debería violar reglas 422")
for case in gv["invalid"]:
    valid_shape = geometry_validator.is_valid(case["geometry"])
    if case["status"] == 400:
        check(not valid_shape, f"{case['id']}: el esquema debería rechazarlo (400)")
    else:
        check(valid_shape, f"{case['id']}: debería cumplir el esquema (el error es 422)")
        got = domain_problem(case["geometry"], W, H) if valid_shape else None
        check(got == case["type"], f"{case['id']}: esperado {case['type']}, obtenido {got}")


# ------------------------------------------------------------ 3. coordenadas
coords = load(FIXTURES / "coordinates.json")
tol = coords["tolerance"]
cases = {c["id"]: c for c in coords["cases"]}
for c in coords["cases"]:
    Wc = c["image"]["width"]
    vw, vh = c["viewer"]["width"], c["viewer"]["height"]
    b = c["viewportBounds"]
    check(abs(b["width"] / b["height"] - vw / vh) < 1e-9, f"{c['id']}: el viewport no conserva la proporción del visor")
    check(abs(b["width"] * Wc / vw - c["level0PxPerScreenPx"]) < tol, f"{c['id']}: escala incorrecta")
    for p in c["points"]:
        sx, sy = p["screen"]
        x0 = (b["x"] + sx / vw * b["width"]) * Wc
        y0 = (b["y"] + sy / vh * b["height"]) * Wc  # ¡por el ANCHO!
        check(abs(x0 - p["level0"][0]) < tol and abs(y0 - p["level0"][1]) < tol,
              f"{c['id']} {p['screen']}: esperado {p['level0']}, calculado {[x0, y0]}")
        # ida y vuelta: nivel 0 → pantalla
        bx, by = b["x"] * Wc, b["y"] * Wc
        s = c["level0PxPerScreenPx"]
        check(abs((p["level0"][0] - bx) / s - sx) < 1e-6 and abs((p["level0"][1] - by) / s - sy) < 1e-6,
              f"{c['id']} {p['screen']}: la vuelta a pantalla no coincide")
    for t in c.get("traps", []):
        check(abs(t["wrongY_ifMultipliedByHeight"] - t["correctLevel0"][1]) > 1,
              f"{c['id']}: la trampa 'y por el alto' no se distingue del valor correcto")
rt = coords["rectangleRoundTrip"]
for r in rt["renders"]:
    c = cases[r["case"]]
    Wc = c["image"]["width"]
    s = c["level0PxPerScreenPx"]
    bx, by = c["viewportBounds"]["x"] * Wc, c["viewportBounds"]["y"] * Wc
    g = rt["geometry"]
    got = {"x": (g["x"] - bx) / s, "y": (g["y"] - by) / s, "width": g["width"] / s, "height": g["height"] / s}
    check(all(abs(got[k] - r["screenRect"][k]) < 1e-6 for k in got), f"ida y vuelta {r['case']}: {got}")


# ----------------------------------------------------------- 4. exportación
exp = load(FIXTURES / "export.json")
img = exp["image"]
order = [c["id"] for c in sorted(exp["classes"], key=lambda c: (c["displayOrder"], c["id"]))]


def ring(geom):
    if geom["type"] == "rectangle":
        x, y, w, h = geom["x"], geom["y"], geom["width"], geom["height"]
        return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    return geom["points"]


def fmt(vals):
    return " ".join(f"{v:.6f}" for v in vals)


for a in exp["annotations"]:
    pts = ring(a["geometry"])
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    bbox = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]
    coco = a["coco"]
    check(coco["bbox"] == bbox, f"anotación {a['id']}: bbox COCO {coco['bbox']} ≠ {bbox}")
    check(coco["segmentation"] == [[v for p in pts for v in p]], f"anotación {a['id']}: segmentation COCO")
    check(abs(coco["area"] - abs(area2(pts)) / 2) < 1e-9, f"anotación {a['id']}: area COCO")
    check(coco["category_id"] == a["classId"], f"anotación {a['id']}: category_id = id de clase")
    idx = order.index(a["classId"])
    cx, cy = bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2
    det = f"{idx} " + fmt([cx / img["width"], cy / img["height"], bbox[2] / img["width"], bbox[3] / img["height"]])
    seg = f"{idx} " + fmt([v / (img["width"] if k % 2 == 0 else img["height"]) for p in pts for k, v in enumerate(p)])
    check(a["yoloDetect"] == det, f"anotación {a['id']}: YOLO detección {a['yoloDetect']} ≠ {det}")
    check(a["yoloSegment"] == seg, f"anotación {a['id']}: YOLO segmentación {a['yoloSegment']} ≠ {seg}")
for c in exp["cricPointToBox"]:
    cx, cy = c["nucleus"]
    half = c["boxSize"] / 2
    x0, y0 = max(0, cx - half), max(0, cy - half)
    x1, y1 = min(c["image"]["width"], cx + half), min(c["image"]["height"], cy + half)
    got = {"type": "rectangle", "x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}
    check(got == c["rectangle"], f"CRIC punto {c['nucleus']}: {got} ≠ {c['rectangle']}")
errors = sorted(export_validator.iter_errors(exp["internalExportExample"]), key=str)
check(not errors, "internalExportExample no cumple el esquema: " + "; ".join(e.message for e in errors[:3]))


# -------------------------------------------------------------------- 5. DZI
dzi = load(FIXTURES / "dzi.json")
for c in dzi["cases"]:
    w, h = c["image"]["width"], c["image"]["height"]
    check(math.ceil(math.log2(max(w, h))) + 1 == c["levelCount"], f"{c['id']}: cantidad de niveles")
    top = c["levelCount"] - 1
    for z, (lw, lh) in c["levelDimensions"].items():
        scale = 2 ** (top - int(z))
        check([math.ceil(w / scale), math.ceil(h / scale)] == [lw, lh], f"{c['id']}: dimensiones del nivel {z}")
    for z, (tx, ty) in c["levelTiles"].items():
        lw, lh = c["levelDimensions"][z]
        check([math.ceil(lw / 254), math.ceil(lh / 254)] == [tx, ty], f"{c['id']}: teselas del nivel {z}")
    for t in c.get("tileForLevel0Point", []):
        scale = 2 ** (top - t["level"])
        addr = [int(Fraction(t["level0"][0], scale) // 254), int(Fraction(t["level0"][1], scale) // 254)]
        check(addr == t["address"], f"{c['id']}: tesela del punto {t['level0']}")
try:
    from openslide.deepzoom import DeepZoomGenerator

    class _MockSlide:
        def __init__(self, w, h, downs):
            self.dimensions = (w, h)
            self.level_downsamples = tuple(float(d) for d in downs)
            self.level_dimensions = tuple((math.ceil(w / d), math.ceil(h / d)) for d in downs)
            self.level_count = len(downs)
            self.properties, self.associated_images = {}, {}

        def get_best_level_for_downsample(self, ds):
            return max(i for i, d in enumerate(self.level_downsamples) if d <= ds)

    d1 = next(c for c in dzi["cases"] if c["id"] == "D1")
    g = DeepZoomGenerator(_MockSlide(d1["image"]["width"], d1["image"]["height"], d1["image"]["slideLevelDownsamples"]),
                          tile_size=254, overlap=1, limit_bounds=False)
    check(g.level_count == d1["levelCount"] and g.tile_count == d1["totalTiles"], "D1: DeepZoomGenerator difiere")
    for t in d1["tileReads"]:
        loc, lvl, size = g.get_tile_coordinates(t["level"], tuple(t["address"]))
        check([list(loc), lvl, list(size)] == [t["level0Location"], t["slideLevel"], t["readSize"]],
              f"D1: lectura de la tesela {t['level']}/{t['address']}")
    print("DZI verificado con DeepZoomGenerator.")
except ImportError:
    print("openslide-python no está instalado: DZI verificado solo con fórmulas.")


# ---------------------------------------------------------------- 6. OpenAPI
try:
    import yaml
    from openapi_spec_validator import validate

    for spec in sorted((ROOT / "openapi").glob("*.yaml")):
        try:
            validate(yaml.safe_load(spec.read_text(encoding="utf-8")), base_uri=spec.as_uri())
        except Exception as e:  # noqa: BLE001
            failures.append(f"{spec.name}: OpenAPI inválida: {e}")
    print("OpenAPI verificadas.")
except ImportError:
    print("openapi-spec-validator no está instalado: se omite la validación OpenAPI.")

if failures:
    print(f"\n{len(failures)} problema(s) en el contrato:")
    for f in failures:
        print("  ✗", f)
    sys.exit(1)
print("Contrato v0.1 verificado: esquemas, reglas de geometría, coordenadas, exportación y DZI.")
