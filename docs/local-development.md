# Local Compatibility API

The compatibility API lets the existing Vue 2 portal read Git-backed content through the Drupal endpoint shapes it already uses. This repository owns the translation and delivery code; the sibling `hugeamp-cms-content` repository owns the canonical content.

## Local placement

The local HTTP server is implemented in `server/local-api.mjs`. It loads the exported files from `../hugeamp-cms-content/content/drupal/` by default and listens on `http://127.0.0.1:8787`.

Run the checks and server from the repository root:

```sh
npm test
npm run serve
```

The local server implements the pilot routes used by the Vue 2 portal:

- `/rest/directcsv?id=...`
- `/rest/data?pageid=...`
- `/view/rest/get_research_page?pageid=...`
- `/view/rest/get_research_page_access?pageid=...`
- `/view/rest/get_research_menu?menu=...`
- `/view/rest/get_research_method?method=...`
- `/rest/views/news2vueportal?portal=...`
- `/rest/views/a2f_community_kps`
- `/rest/views/byor_projects`
- `/rest/views/help_book`
- `/rest/views/content_by_id?nid=...`
- `/rest/views/help_book_search?body=...`
- `/health`

Protected development-page login is intentionally deferred and currently returns an empty array. The server allows local cross-origin requests by default. `HUGEAMP_ALLOWED_ORIGIN` can restrict the allowed portal origin, while `HOST`, `PORT`, `HUGEAMP_CONTENT_ROOT`, and `HUGEAMP_ASSET_BASE_URL` can override their local defaults.

Content is loaded when the server starts, so restart it after editing or re-exporting content.

## Vue 2 connection

The pilot branch keeps the content endpoint selection next to the Drupal base URL in `src/modules/hugeampkpncms.js` and `src/modules/kp4cd.js`:

```js
const CONTENT_CMS_BASE_URL = "http://127.0.0.1:8787"; // Local Git-backed API
// const CONTENT_CMS_BASE_URL = DRUPAL_CMS_BASE_URL; // Drupal
```

Comment one line and uncomment the other to switch sources. Replace the local URL with the hosted compatibility API URL when that service is deployed. The portal uses its normal `npm run build` and `npm run watch` commands.

The local mode redirects Research Page, access, Header Menu, Research Method, embedded Research Page datasets, News, Community Portal, BYOR project, and Help Book requests. Basic and Book page bodies are available through the content-by-node-ID route. Protected-page login and media remain on Drupal during the pilot.

## Live placement

For production, GitHub remains the content source and editing workflow. The compatibility API becomes a separately deployed delivery layer built from this repository.

The adapter logic in `src/compatibility.mjs` is independent of the local Node server so it can be reused in a serverless or edge function. The eventual host may be an existing Broad service, AWS, Cloudflare, Netlify, Vercel, or another platform selected during production planning.

A live deployment must add:

- Automated build and deployment from an approved Git branch
- A stable HTTPS API hostname
- Restricted CORS origins
- Caching and cache invalidation
- Deployment rollback and content promotion rules
- Monitoring and error reporting
- Server-side access enforcement for protected content

The hosting choice does not change the canonical content format or the Vue compatibility contract.
