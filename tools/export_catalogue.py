#!/usr/bin/env python3
"""Export the Tessera run catalogue as JSON for the website's database viewer.

Joins three sources into one row per design point:

  design      v0tessera.hdf5          cosmology, percentile anchor, subgrid rows
  ledger      v0tessera_regions.hdf5  region labels
  catalogue   regions.json            realised selection (overdensity, bbox, ...)
  run dirs    <zooms>/P*/R*           status inferred from artefacts on disk

Run on a COSMA login node that mounts the zoom scratch area:

  python3 tools/export_catalogue.py \
      --suite   $REPO/data/v0tessera.hdf5 \
      --regions $REPO/data/v0tessera_regions.hdf5 \
      --catalogue $META7/regions.json \
      --mapping $REPO/configs/v0tessera_subgrid_mapping.yaml \
      --zooms   $ZOOMS --out catalogue.json --layers-out layers.json

Status is inferred purely from which files exist, so re-running is always safe.
"""
from __future__ import annotations

import argparse
import configparser
import datetime as dt
import json
import math
import re
from pathlib import Path

import h5py
import numpy as np

COSMO = ["Omega_m", "Omega_b", "h", "n_s", "sigma_8", "w_0", "w_a"]
SWIFT_CORES = 28
STATUS_ORDER = ["not selected", "selected", "ics", "started", "completed",
                "structure", "trees", "masks", "galaxies"]


# ---------------------------------------------------------------- helpers

def sig(x, n=6):
    """Round to n significant digits; NaN/inf -> None."""
    if x is None:
        return None
    x = float(x)
    if not math.isfinite(x):
        return None
    if x == 0:
        return 0.0
    return float(f"{x:.{n}g}")


def read_mapping(path):
    """Subgrid mapping YAML -> list of dicts (minimal parser, no pyyaml needed)."""
    try:
        import yaml
        with open(path) as fh:
            return yaml.safe_load(fh)["columns"]
    except ImportError:
        cols, cur = [], None
        for line in Path(path).read_text().splitlines():
            s = line.split("#", 1)[0].rstrip()
            if not s.strip():
                continue
            m = re.match(r"\s*-\s+name:\s*(\S+)", s)
            if m:
                cur = {"name": m.group(1)}
                cols.append(cur)
                continue
            m = re.match(r"\s+(\w+):\s*(\S+)", s)
            if m and cur is not None:
                k, v = m.groups()
                try:
                    v = float(v)
                except ValueError:
                    pass
                cur[k] = v
        return cols


def map_subgrid(u, col):
    lo, hi = float(col["lo"]), float(col["hi"])
    if col.get("scale") == "log":
        v = 10 ** (math.log10(lo) + u * (math.log10(hi) - math.log10(lo)))
    else:
        v = lo + u * (hi - lo)
    if "clip_lo" in col:
        v = max(v, float(col["clip_lo"]))
    if "clip_hi" in col:
        v = min(v, float(col["clip_hi"]))
    return v


def fragment_model(path):
    cp = configparser.ConfigParser(strict=False)
    cp.read(path)
    try:
        return cp["execution"]["name_model"]
    except KeyError:
        return None


def swift_walltime_hours(ts):
    """Sum of the per-step wall-clock column of a SWIFT timesteps.txt."""
    tot, a_last = 0.0, None
    try:
        with open(ts, errors="replace") as fh:
            for line in fh:
                if line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) < 13:
                    continue  # partial line of a run still writing
                try:
                    tot += float(parts[12])
                    a_last = float(parts[2])
                except ValueError:
                    continue
    except OSError:
        return None, None
    return (tot / 3.6e6 if a_last is not None else None), a_last


def snap_counts(path):
    try:
        with h5py.File(path, "r") as f:
            n = f["Header"].attrs["NumPart_Total"]
            hw = f["Header"].attrs["NumPart_Total_HighWord"]
            n = n.astype(np.int64) + (hw.astype(np.int64) << 32)
            return int(n[1]), int(n[2])
    except Exception:
        return None, None


def fof_count(path):
    try:
        with h5py.File(path, "r") as f:
            return int(f["Groups/Sizes"].shape[0])
    except Exception:
        return None


# ---------------------------------------------------------------- run scan

def scan_run(d: Path, fragments):
    """Infer what exists for one zoom run directory."""
    r = dict(ics=False, started=False, swift_done=False, hbt=False, trees=False,
             masks=False, archived=False, n_snaps=0, shark_layers=0, seds_layers=0,
             n_layers=len(fragments), walltime_h=None, n_highres=None,
             n_lowres=None, n_fof_z0=None, machine="")
    if not d.is_dir():
        return r
    s = str(d.resolve())
    r["machine"] = "cosma8" if "/snap8/" in s else "cosma7" if "/snap7/" in s or "/cosma7/" in s else ""
    r["ics"] = any(d.glob("zoom_ICS_*.hdf5")) or (d / "music2_zoom.conf_log.txt").exists()
    snaps = sorted(d.glob("snap_[0-9][0-9][0-9][0-9].hdf5"))
    r["n_snaps"] = len(snaps)
    ts = d / "timesteps.txt"
    if ts.exists():
        r["started"] = True
        wt, a_last = swift_walltime_hours(ts)
        r["walltime_h"] = wt
        if a_last is not None and a_last >= 0.999999:
            r["swift_done"] = True
    last = d / "snap_0139.hdf5"
    if last.exists():
        r["swift_done"] = True
        r["n_highres"], r["n_lowres"] = snap_counts(last)
    fof = d / "fof_0139.hdf5"
    if fof.exists():
        r["n_fof_z0"] = fof_count(fof)
    r["hbt"] = (d / "hbt.tar.zst").exists() or any((d / "hbt" / "139").glob("SubSnap_139.*.hdf5"))
    tr = d / "trees"
    r["trees"] = (tr / "build_trees_done").exists() or any(tr.glob("tree_*.hdf5"))
    r["masks"] = (d / "region_masks.hdf5").is_file()
    r["archived"] = (d / "shark_output.tar.zst").exists()
    layers = []
    for layer, frag in fragments:
        fp = d / frag
        if not fp.exists():
            continue
        model = fragment_model(fp)
        if r["archived"]:  # archive_run only packs once every model has SFH + SEDs
            sfh = seds = True
        else:
            out = d / "shark_output"
            sfh = any(out.glob(f"*/{model}/*/*/star_formation_histories.hdf5")) if model else False
            seds = any(out.glob(f"*/{model}/*/*/shark_seds.hdf5")) if model else False
        layers.append((layer, model, sfh, seds))
    r["n_layers"] = len(layers)
    r["shark_layers"] = sum(1 for l in layers if l[2])
    r["seds_layers"] = sum(1 for l in layers if l[3])
    r["_layers"] = layers
    return r


def status_of(selected, r):
    if r["shark_layers"] > 0:
        return "galaxies"
    if r["masks"]:
        return "masks"
    if r["trees"]:
        return "trees"
    if r["hbt"]:
        return "structure"
    if r["swift_done"]:
        return "completed"
    if r["started"]:
        return "started"
    if r["ics"]:
        return "ics"
    return "selected" if selected else "not selected"


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--suite", type=Path, required=True)
    ap.add_argument("--regions", type=Path, required=True)
    ap.add_argument("--catalogue", type=Path, required=True)
    ap.add_argument("--mapping", type=Path, required=True)
    ap.add_argument("--zooms", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("catalogue.json"))
    ap.add_argument("--layers-out", type=Path, default=Path("layers.json"))
    ap.add_argument("--suite-name", default="v0tessera")
    ap.add_argument("--limit", type=int, default=None, help="Scan only the first N design rows (testing).")
    args = ap.parse_args()

    with h5py.File(args.suite, "r") as f:
        cosmo = f["cosmology"][:]
        anchor = f["percentile_anchor"][:]
        subgrid = f["subgrid"][:]
        sg_names = [str(s) for s in f["subgrid"].attrs["names"]]
        gl = f["galaxy_layers_unit"][:] if "galaxy_layers_unit" in f else None
        n_parents = int(f.attrs["n_parents"])
        design_attrs = {k: (v.tolist() if hasattr(v, "tolist") else v) for k, v in f.attrs.items()}
    with h5py.File(args.regions, "r") as f:
        labels = {int(p): str(l) for p, l, i in zip(f["parent_idx"][:], f["label"].asstr()[:], f["region_idx"][:])
                  if int(i) == 0}
        reg_attrs = {k: (v.tolist() if hasattr(v, "tolist") else v) for k, v in f.attrs.items()}

    cat = json.loads(args.catalogue.read_text())
    realised = {int(r["parent_idx"]): r for r in cat["regions"]}

    mapping = read_mapping(args.mapping)
    named = [(i, c) for i, c in enumerate(mapping) if not c["name"].startswith("spare")]
    gal_names = [c["name"] for _, c in named]
    fragments = [(1, "shark_subgrid.conf")] + [(L, f"shark_subgrid_r{L}.conf") for L in range(2, 2 + (gl.shape[0] if gl is not None else 0))]

    columns = [
        ("parent_idx", "int", "Parent index", "", "identity"),
        ("label", "str", "Region label", "", "identity"),
        ("block", "int", "Design block (1024 rows)", "", "identity"),
        ("status", "str", "Pipeline status", "", "status"),
        ("Omega_m", "float", "Ω_m", "", "cosmology"),
        ("Omega_b", "float", "Ω_b", "", "cosmology"),
        ("h", "float", "h", "", "cosmology"),
        ("n_s", "float", "n_s", "", "cosmology"),
        ("sigma_8", "float", "σ_8", "", "cosmology"),
        ("w_0", "float", "w_0", "", "cosmology"),
        ("w_a", "float", "w_a", "", "cosmology"),
        ("w0_plus_wa", "float", "w_0 + w_a", "", "cosmology"),
        ("target_percentile", "float", "Target overdensity percentile", "%", "region"),
        ("log10_1p_delta", "float", "log10(1 + δ) realised", "", "region"),
        ("delta", "float", "δ realised", "", "region"),
        ("absorbed_haloes", "int", "Boundary haloes absorbed", "", "region"),
        ("n_region_particles", "int", "Parent particles in region", "", "region"),
        ("region_radius_mpc", "float", "Selection radius", "Mpc", "region"),
        ("bbox_extent_mpc", "float", "Largest bounding-box side", "Mpc", "region"),
        ("n_highres", "int", "High-resolution particles", "", "zoom"),
        ("n_lowres", "int", "Low-resolution particles", "", "zoom"),
        ("m_highres", "float", "High-resolution particle mass", "M☉/h", "zoom"),
        ("n_fof_z0", "int", "FoF groups at z = 0", "", "zoom"),
        ("walltime_h", "float", "SWIFT wall time", "h", "zoom"),
        ("cpu_hours", "float", "SWIFT CPU time", "core h", "zoom"),
        ("n_snaps", "int", "Snapshots on disk", "", "zoom"),
        ("ics", "bool", "Initial conditions", "", "stage"),
        ("swift_done", "bool", "SWIFT finished", "", "stage"),
        ("hbt", "bool", "HBT-HERONS", "", "stage"),
        ("trees", "bool", "DHalo trees", "", "stage"),
        ("masks", "bool", "Region masks", "", "stage"),
        ("n_layers", "int", "Galaxy layers available", "", "galaxies"),
        ("shark_layers", "int", "SHARK layers complete", "", "galaxies"),
        ("seds_layers", "int", "Synthesizer SED layers complete", "", "galaxies"),
        ("machine", "str", "Machine", "", "zoom"),
    ] + [(n, "float", n.replace("shark_", "SHARK "), "", "galaxies") for n in gal_names]

    rows, layers_out, status_counts = [], {}, {}
    N = min(n_parents, args.limit) if args.limit else n_parents
    for j in range(N):
        sel = realised.get(j)
        label = labels.get(j, "")
        run_dir = args.zooms / f"P{j:05d}" / "R0000"
        scan = scan_run(run_dir, fragments) if sel else scan_run(Path("/nonexistent"), fragments)
        st = status_of(sel is not None, scan)
        status_counts[st] = status_counts.get(st, 0) + 1
        c = cosmo[j]
        gal_phys = [map_subgrid(float(subgrid[j, i]), col) for i, col in named]
        s = sel["selection"] if sel else {}
        b = sel["bbox"] if sel else {}
        ms = sel["mass_summary"] if sel else {}
        row = [
            j, label, j // 1024, st,
            sig(c[0]), sig(c[1]), sig(c[2]), sig(c[3]), sig(c[4]), sig(c[5]), sig(c[6]), sig(c[5] + c[6]),
            sig(anchor[j], 5),
            sig(s.get("log10_1p_delta"), 5), sig(s.get("delta"), 5),
            s.get("absorbed_halo_count"), sel["counts"]["n_selected_particles"] if sel else None,
            sig(s.get("selection_radius_mpc"), 5),
            sig(max(b["extent_abs_mpc"]), 5) if b else None,
            scan["n_highres"], scan["n_lowres"],
            sig(ms["highres_particle_mass_1e10msun_h"] * 1e10, 4) if ms else None,
            scan["n_fof_z0"], sig(scan["walltime_h"], 4),
            sig(scan["walltime_h"] * SWIFT_CORES, 4) if scan["walltime_h"] is not None else None,
            scan["n_snaps"],
            scan["ics"], scan["swift_done"], scan["hbt"], scan["trees"], scan["masks"],
            scan["n_layers"], scan["shark_layers"], scan["seds_layers"], scan["machine"],
        ] + [sig(v, 5) for v in gal_phys]
        rows.append(row)
        if scan.get("_layers"):
            out = []
            for layer, model, sfh, seds in scan["_layers"]:
                if layer == 1:
                    u = [float(subgrid[j, i]) for i, _ in named]
                elif gl is not None and j < gl.shape[1]:
                    u = [float(gl[layer - 2, j, k]) for k in range(len(named))]
                else:
                    u = None
                params = [sig(map_subgrid(uu, col), 5) for uu, (_, col) in zip(u, named)] if u else None
                out.append({"layer": layer, "model": model, "sfh": sfh, "seds": seds, "params": params})
            layers_out[str(j)] = out
        if j % 256 == 0:
            print(f"  {j}/{N}", flush=True)

    meta = {
        "suite": args.suite_name,
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "n_rows": N,
        "n_selected": sum(1 for j in range(N) if j in realised),
        "status_order": STATUS_ORDER,
        "status_counts": status_counts,
        "cosmo_param_lo": design_attrs.get("param_lo"),
        "cosmo_param_hi": design_attrs.get("param_hi"),
        "galaxy_param_names": gal_names,
        "n_galaxy_layers": len(fragments),
        "levelmax": reg_attrs.get("levelmax"),
        "radius_mpch": 31.0,
    }
    cols = [dict(name=n, type=t, label=l, unit=u, group=g) for n, t, l, u, g in columns]
    args.out.write_text(json.dumps({"meta": meta, "columns": cols, "rows": rows}, separators=(",", ":"), allow_nan=False))
    args.layers_out.write_text(json.dumps({"names": gal_names, "layers": layers_out}, separators=(",", ":")))
    print("status:", status_counts)
    print("wrote", args.out, args.out.stat().st_size // 1024, "KB;", args.layers_out, args.layers_out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
