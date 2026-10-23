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

## Needed deployment workflow

Production deployments should package a validated, immutable revision of
[`hugeamp-cms-content`](https://github.com/a-shilin/hugeamp-cms-content) with the
API. GitHub is the content source during continuous integration and deployment,
not while the API is handling requests.

At startup, the server reads the migration manifest and all referenced content
files, then builds its in-memory lookup maps. A running instance should therefore
read content from its local deployment artifact and should not fetch individual
content records from GitHub on demand.

### Pin an approved content revision

Add a `content-revision.txt` file to this repository containing the exact commit
SHA of the approved
[`hugeamp-cms-content`](https://github.com/a-shilin/hugeamp-cms-content)
revision:

```text
1c4b0b7567d7933c9b34dd1d66e30de62462874a
```

An immutable commit SHA should be used instead of a moving branch such as
`main`. Updating content in an environment then becomes an explicit promotion:

1. Merge the content changes in [`hugeamp-cms-content`](https://github.com/a-shilin/hugeamp-cms-content).
2. Confirm that the content repository's validation passes.
3. Update `content-revision.txt` in this repository to the approved commit SHA.
4. Run the content validation and API tests together in CI.
5. Build and deploy a new API artifact containing that content snapshot.

This keeps content changes reviewable, makes deployments reproducible, and makes
rollback possible without depending on the current state of a Git branch.

### CI checkout and validation

A GitHub Actions workflow should check out this repository, read the pinned
content revision, and check out the content repository at that exact revision.
The following is an illustrative build sequence; the final workflow will also
need deployment-provider configuration and credentials:

```yaml
steps:
  - name: Check out API
    uses: actions/checkout@v4

  - name: Read approved content revision
    id: content
    run: echo "sha=$(cat content-revision.txt)" >> "$GITHUB_OUTPUT"

  - name: Check out approved content
    uses: actions/checkout@v4
    with:
      repository: a-shilin/hugeamp-cms-content
      ref: ${{ steps.content.outputs.sha }}
      path: vendor/hugeamp-cms-content

  - name: Validate content
    working-directory: vendor/hugeamp-cms-content
    run: npm test

  - name: Test compatibility API
    run: npm test

  - name: Build deployment image
    run: docker build -t hugeamp-content-api:${{ github.sha }} .
```

The content repository's `npm test` command runs its structural and manifest
validation, including record counts, publication status, Drupal identity fields,
and excluded credential keys. The API tests verify the legacy response adapters.
Both must pass before an image is published or deployed.

If [`hugeamp-cms-content`](https://github.com/a-shilin/hugeamp-cms-content) is
private, the workflow needs a fine-grained token or GitHub App token with read
access to that repository. GitHub's default workflow
token normally does not grant access to a different private repository. The
cross-repository credential belongs in CI only and should not be included in the
runtime image.

### Package content in an immutable image

Docker is the recommended packaging approach. The image should contain only the
API runtime files and the validated `content/drupal` directory from the pinned
content checkout. A suitable Dockerfile is:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server/ ./server/
COPY src/ ./src/

COPY vendor/hugeamp-cms-content/content/drupal/ /app/content/drupal/

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV HUGEAMP_CONTENT_ROOT=/app/content/drupal

USER node

EXPOSE 8787

CMD ["node", "server/local-api.mjs"]
```

The repository will also need a `.dockerignore` that excludes development files,
Git metadata, and the nested content checkout's `.git` directory without
excluding `vendor/hugeamp-cms-content/content/drupal`.

The resulting runtime layout is expected to resemble:

```text
/app/
  package.json
  server/
  src/
  content/
    drupal/
      _meta/
      basic-pages/
      books/
      community-portals/
      navigation/
      news/
      research-methods/
      research-pages/
```

`HUGEAMP_CONTENT_ROOT=/app/content/drupal` tells the server to use the packaged
snapshot. The content is loaded once when the process starts, so all instances of
the same image serve the same content without GitHub credentials or network
requests.

### Revision metadata and rollback

Every published artifact should record both the API revision and the content
revision. For example:

```text
API commit:     90ef06d
Content commit: 1c4b0b7
Image tag:      api-90ef06d_content-1c4b0b7
```

The revisions can also be stored as Open Container Initiative image labels:

```dockerfile
ARG API_REVISION
ARG CONTENT_REVISION

LABEL org.opencontainers.image.revision=$API_REVISION
LABEL org.hugeamp.content.revision=$CONTENT_REVISION
```

Rollback should redeploy a previously published immutable image rather than
editing files in a running container or moving the content branch backward.

### Deployment sequence

```text
Content pull request
  -> content validation
  -> merge approved content commit
  -> update content-revision.txt
  -> API tests and pinned-content validation
  -> build and publish immutable image
  -> deploy to staging
  -> smoke test legacy endpoints
  -> promote the same image to production
```

Content changes require a new image build and process restart. This is deliberate:
it prevents partially updated content, provides a clear audit trail, and ensures
that staging and production can run the exact same artifact.

### Why content should not be fetched at request time

Fetching files directly from GitHub while serving requests would introduce:

- GitHub latency and availability into every request or startup
- API rate-limit and authentication dependencies
- Partially updated content if files change during a multi-file load
- More difficult caching, rollback, and incident diagnosis
- GitHub credentials in the runtime environment for private content

Packaging the content snapshot moves all GitHub access into CI and gives each
running API instance a complete, internally consistent content revision.

### Remaining deployment decisions and files

The deployment mechanism is not implemented yet. Completing it requires:

- `content-revision.txt` with the first approved content commit
- A production `Dockerfile`
- A `.dockerignore`
- A GitHub Actions build and deployment workflow
- A container registry and hosting destination
- CI credentials for cross-repository checkout and the deployment provider
- Restricted production CORS configuration through `HUGEAMP_ALLOWED_ORIGIN`
- Production values for `HUGEAMP_ASSET_BASE_URL`, `HOST`, and `PORT`
- Health checks, monitoring, logs, and error reporting
- Cache policy and invalidation behavior at the hosting or CDN layer
- Staging smoke tests for the legacy endpoint contracts
- A documented content approval, promotion, and rollback policy

For a non-container deployment, the same invariants still apply: CI must check
out an exact content commit, validate it, copy `content/drupal` into one immutable
deployment bundle, set `HUGEAMP_CONTENT_ROOT` to that packaged path, and deploy
the API code and content snapshot together.
