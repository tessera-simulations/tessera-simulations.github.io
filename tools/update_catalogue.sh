#!/bin/bash
# Refresh assets/data/{catalogue,layers}.json from COSMA. Run from the repo root.
#   bash tools/update_catalogue.sh && git add assets/data && git commit -m "Update run catalogue"
set -euo pipefail
HOST=${HOST:-cosma7}
REPO7=/cosma7/data/dp004/dc-love2/codes/tessera
META7=/cosma7/data/dp004/dc-love2/data/tessera/v0tessera
ZOOMS=/snap7/scratch/dp004/dc-love2/tessera/v0tessera/zooms
OUT=$META7/site
scp -q tools/export_catalogue.py "$HOST:$REPO7/scripts/export_catalogue_site.py"
ssh "$HOST" "mkdir -p $OUT && cd $REPO7 && python3 scripts/export_catalogue_site.py \
  --suite data/v0tessera.hdf5 --regions data/v0tessera_regions.hdf5 \
  --catalogue $META7/regions.json --mapping configs/v0tessera_subgrid_mapping.yaml \
  --zooms $ZOOMS --out $OUT/catalogue.json --layers-out $OUT/layers.json | tail -2"
scp -q "$HOST:$OUT/catalogue.json" "$HOST:$OUT/layers.json" assets/data/
ls -la assets/data/
