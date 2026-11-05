# tessera-simulations.github.io

Public website for the Tessera project, built with Jekyll and served by GitHub Pages.

## Editing

- Pages are Markdown or HTML files at the top level (`about.md`, `data.md`, ...).
- News items are Markdown files in `_posts/`, named `YYYY-MM-DD-slug.md`.
- People, publications, data products and the navigation are YAML files in `_data/`.
- Figures live in `assets/img/figures/`; keep them under ~1 MB each (webp, 1600 px wide).

## Local preview

With the `github-pages` gem (matches GitHub exactly, slow to install):

```bash
bundle install
bundle exec jekyll serve
```

Or with a plain user-installed jekyll (`gem install --user-install jekyll jekyll-feed jekyll-seo-tag`):

```bash
export PATH=$HOME/.local/share/gem/ruby/3.3.0/bin:$PATH
BUNDLE_GEMFILE=Gemfile.dev jekyll serve
```

Then open http://localhost:4000.

## Run catalogue

The run table lives on the Durham data archive (https://virgo.dur.ac.uk/tessera/,
from the private `public-data-frontend` repo); the Data link in the menu goes there, and
`data.html` forwards old `/data/?row=N` links. This repo still hosts its data, which the
archive page reads cross-site: `assets/data/catalogue.json` (one row per design point) and
`assets/data/layers.json` (per-run galaxy layers). Both are generated on COSMA by
`tools/export_catalogue.py`, which joins the suite design, the regions ledger,
`regions.json`, the files present in each zoom run directory and the Durham
archive's copy log. To refresh, run this on a cosma7 login node that mounts
`/mnt/dc-love2` (login7a does):

```bash
cd /cosma7/data/dp004/dc-love2/codes/tessera
curl -fsSL https://raw.githubusercontent.com/tessera-simulations/tessera-simulations.github.io/main/tools/export_catalogue.py \
  -o scripts/export_catalogue_site.py     # the current exporter from this repo
SITE=/cosma7/data/dp004/dc-love2/data/tessera/v0tessera/site
python3 scripts/export_catalogue_site.py \
  --suite data/v0tessera.hdf5 --regions data/v0tessera_regions.hdf5 \
  --catalogue /cosma7/data/dp004/dc-love2/data/tessera/v0tessera/regions.json \
  --mapping configs/v0tessera_subgrid_mapping.yaml \
  --zooms /snap7/scratch/dp004/dc-love2/tessera/v0tessera/zooms \
  --archive /mnt/dc-love2/data/tessera/v0tessera \
  --out $SITE/catalogue.json --layers-out $SITE/layers.json
```

then copy the two files here and publish:

```bash
SITE=/cosma7/data/dp004/dc-love2/data/tessera/v0tessera/site
scp cosma7:$SITE/catalogue.json cosma7:$SITE/layers.json assets/data/
git add assets/data && git commit -m "Update run catalogue" && git push
```

`--archive` fills the `archive_*` columns from `migration_logs/status.tsv`, which
say which runs the archive page offers for download.
Leave it out and those columns are empty, but the rest of the catalogue is unchanged.

Status is inferred purely from what exists on disk, so re-running is always safe.
Adding a column means appending to the `columns` list in the exporter and the
matching value in `row`; the archive page reads the column list from the JSON.
