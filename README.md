# HuGeAMP Content Compatibility API

This repository serves canonical HuGeAMP content in the legacy Drupal response shapes expected by the existing Vue 2 portal.

It is a transitional delivery layer. The API can be retired after the Vue 2 portal and any other consumers of the legacy endpoints have moved to the Nuxt application or another supported content interface.

## Local layout

Place this repository beside the content repository:

```text
CMS/
  hugeamp-content-api/
  hugeamp-cms-content/
```

The server reads `../hugeamp-cms-content/content/drupal` by default. Set `HUGEAMP_CONTENT_ROOT` to use another checkout or packaged content directory.

## Commands

```sh
npm test
npm run serve
```

The local server listens on `http://127.0.0.1:8787` by default. See [local development](docs/local-development.md) for endpoint and Vue 2 integration details.

## Legacy endpoint coverage

The compatibility API currently implements these Drupal-compatible routes:

- `/rest/directcsv?id=...`
- `/rest/data?pageid=...`
- `/view/rest/get_research_page_access?pageid=...`
- `/view/rest/get_research_page?pageid=...`
- `/view/rest/get_research_menu?menu=...`
- `/view/rest/get_research_method?method=...`
- `/rest/views/news2vueportal?portal=...`
- `/rest/views/a2f_community_kps`
- `/rest/views/byor_projects`
- `/rest/views/help_book`
- `/rest/views/content_by_id?nid=...`
- `/rest/views/help_book_search?body=...`

`/view/rest/get_research_page_dev?pageid=...&devid=...&devpw=...` is present as a
placeholder and returns an empty array. Protected development-page authentication
is intentionally deferred until credentials can be stored and checked outside the
public content repository.

BYOR image responses continue to reference Drupal-hosted assets by default. Set
`HUGEAMP_ASSET_BASE_URL` to change the asset origin.

Production builds should check out a validated revision of `hugeamp-cms-content` and package it with this service. The running API should not fetch every content record from GitHub on demand.
