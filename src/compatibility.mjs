import { readFile } from "node:fs/promises";
import path from "node:path";

function legacyValue(value) {
  return value === null || value === undefined || value === "" ? false : value;
}

function legacyBoolean(value) {
  return value === null || value === undefined ? false : value ? "1" : "0";
}

function legacyNumber(value) {
  return value === null || value === undefined || value === "" ? false : String(value);
}

export function toLegacyResearchPage(record) {
  return {
    title: record.title,
    uid: legacyNumber(record.legacyAssetOwnerId),
    body: legacyValue(record.bodyHtml),
    field_page_id: record.pageId,
    field_research_method: legacyValue(record.researchMethodId),
    field_page_header_menu_node_id: legacyValue(record.headerId),
    field_data_table_format: legacyValue(record.dataTableFormat),
    field_data_table_legend: legacyValue(record.dataTableLegendHtml),
    field_number_of_rows: legacyNumber(record.numberOfRows),
    field_filters: legacyValue(record.filters),
    field_data_visualizer: legacyValue(record.dataVisualizer),
    field_visualizer_configuration: legacyValue(record.visualizerConfiguration),
    field_page_mode: legacyValue(record.mode),
    field_dev_id: false,
    field_dev_password: false,
    field_landing_page: legacyBoolean(record.isProjectLandingPage),
    field_data_visualizer_legend: legacyValue(record.dataVisualizerLegendHtml),
    field_data_points: legacyValue(record.dataPoints),
    field_data_points_list_labels: legacyValue(record.dataPointsListLabels),
    field_page_style: legacyValue(record.pageStyle),
    field_api_parameters: legacyValue(record.apiParameters),
    field_data_type: legacyValue(record.dataType),
    field_is_api: legacyBoolean(record.isDataPointDynamic),
    field_filter_width: legacyValue(record.filterWidth),
    field_data_comparison: legacyValue(record.dataComparisonFormat),
    field_custom_visualizer: legacyValue(record.customVisualizer),
  };
}

export function toLegacyResearchAccess(record) {
  return {
    title: record.title,
    field_page_mode: legacyValue(record.mode),
    field_page_id: record.pageId,
    field_display_on_kp: legacyBoolean(record.displayOnKp),
  };
}

export function toLegacyMenu(record) {
  return {
    title: record.title,
    field_menu: legacyValue(record.menu),
    field_portal_style: legacyValue(record.styleCss),
    field_header_logo: legacyValue(record.logoHtml),
  };
}

export function toLegacyResearchMethod(record) {
  return {
    title: record.title,
    body: legacyValue(record.bodyHtml),
  };
}

export function toLegacyDirectCsv(record) {
  return {
    field_data_points: legacyValue(record.dataPoints),
    field_data_table_format: legacyValue(record.dataTableFormat),
    field_filters: legacyValue(record.filters),
    field_visualizer_configuration: legacyValue(record.visualizerConfiguration),
    body: legacyValue(record.bodyHtml),
  };
}

export function toLegacyData(record) {
  return {
    field_data_points: legacyValue(record.dataPoints),
    field_data_table_format: legacyValue(record.dataTableFormat),
  };
}

export function toLegacyByorProject(
  record,
  assetBaseUrl = "https://hugeampkpncms.org",
) {
  return {
    title: record.title,
    field_image_byor_front: legacyAssetUrl(record.byorFrontImage?.sourceUri, assetBaseUrl),
    field_byor_project_summary: legacyValue(record.projectSummary),
    field_page_id: record.pageId,
    field_url_to_page: legacyValue(record.urlToPage),
  };
}

export function toLegacyNews(record) {
  return {
    title: record.title,
    body: legacyValue(record.summary),
    view_node: `<a href="/node/${record.drupalNodeId}" hreflang="en">view</a>`,
    nid: String(record.drupalNodeId),
    field_portals: legacyValue(record.project),
    field_image: firstImageSource(record.thumbnailHtml) ?? "",
  };
}

export function toLegacyCommunityPortal(record) {
  return {
    title: record.title,
    body: legacyValue(record.bodyHtml),
    field_portal_address: legacyValue(record.portalAddress),
  };
}

export function toLegacyContentById(record) {
  return {
    title: record.title,
    body: legacyValue(record.bodyHtml),
  };
}

export function toLegacyBookToc(records) {
  const byId = new Map(records.map((record) => [record.drupalNodeId, record]));
  return orderBookPages(records)
    .filter((record) => record.depth >= 2)
    .map((record) => {
      const root = byId.get(record.bookId);
      const chapterId = record.outlinePath[1] ?? record.drupalNodeId;
      const chapter = byId.get(chapterId) ?? record;
      return {
        title_1: root?.title ?? record.title,
        nid_1: String(root?.drupalNodeId ?? record.bookId),
        title_2: chapter.title,
        nid_2: String(chapter.drupalNodeId),
        title: record.title,
        nid: String(record.drupalNodeId),
      };
    });
}

export function matchesProject(record, project) {
  if (!project) return true;
  return String(record.project ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .includes(project.trim().toLowerCase());
}

export async function loadCompatibilityContent(contentRoot) {
  const manifest = JSON.parse(
    await readFile(path.join(contentRoot, "_meta/migration-manifest.json"), "utf8"),
  );
  const researchPages = await Promise.all(
    manifest.content.researchPages.map(({ file }) => readJson(path.join(contentRoot, file))),
  );
  const headers = await Promise.all(
    manifest.content.navigation.map(({ file }) => readJson(path.join(contentRoot, file))),
  );
  const researchMethods = await Promise.all(
    (manifest.content.researchMethods ?? []).map(({ file }) =>
      readJson(path.join(contentRoot, file)),
    ),
  );
  const basicPages = await readManifestCollection(contentRoot, manifest.content.basicPages);
  const bookPages = await readManifestCollection(contentRoot, manifest.content.books);
  const news = await readManifestCollection(contentRoot, manifest.content.news);
  const communityPortals = await readManifestCollection(
    contentRoot,
    manifest.content.communityPortals,
  );
  const pagesByNodeId = new Map(
    [...basicPages, ...bookPages, ...news, ...communityPortals].map((record) => [
      String(record.drupalNodeId),
      record,
    ]),
  );

  const researchByPageId = new Map();
  for (const record of researchPages) {
    if (!researchByPageId.has(record.pageId)) researchByPageId.set(record.pageId, []);
    researchByPageId.get(record.pageId).push(record);
  }

  return {
    researchPages,
    headers,
    researchMethods,
    basicPages,
    bookPages,
    news,
    communityPortals,
    pagesByNodeId,
    researchByPageId,
    headersByNodeId: new Map(headers.map((header) => [String(header.drupalNodeId), header])),
    researchMethodsByNodeId: new Map(
      researchMethods.map((method) => [String(method.drupalNodeId), method]),
    ),
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readManifestCollection(contentRoot, entries = []) {
  return Promise.all(entries.map(({ file }) => readJson(path.join(contentRoot, file))));
}

function firstImageSource(html) {
  if (!html) return null;
  const match = /<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(html);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function legacyAssetUrl(sourceUri, assetBaseUrl) {
  if (!sourceUri) return false;
  if (/^https?:\/\//i.test(sourceUri)) return sourceUri;
  if (!sourceUri.startsWith("public://")) return sourceUri;

  const relativePath = sourceUri
    .slice("public://".length)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${assetBaseUrl.replace(/\/$/, "")}/sites/default/files/${relativePath}`;
}

function orderBookPages(records) {
  const children = new Map();
  for (const record of records) {
    const parentId = record.parentId ?? null;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(record);
  }
  for (const siblings of children.values()) {
    siblings.sort((left, right) => left.weight - right.weight || left.drupalNodeId - right.drupalNodeId);
  }

  const ordered = [];
  const visit = (record) => {
    ordered.push(record);
    for (const child of children.get(record.drupalNodeId) ?? []) visit(child);
  };
  for (const root of children.get(null) ?? []) visit(root);
  return ordered;
}
