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
