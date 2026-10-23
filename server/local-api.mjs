import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadCompatibilityContent,
  matchesProject,
  toLegacyBookToc,
  toLegacyByorProject,
  toLegacyCommunityPortal,
  toLegacyContentById,
  toLegacyData,
  toLegacyDirectCsv,
  toLegacyMenu,
  toLegacyNews,
  toLegacyResearchAccess,
  toLegacyResearchMethod,
  toLegacyResearchPage,
} from "../src/compatibility.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.resolve(
  process.env.HUGEAMP_CONTENT_ROOT ??
    path.join(repositoryRoot, "../hugeamp-cms-content/content/drupal"),
);
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.HUGEAMP_ALLOWED_ORIGIN ?? "*";
const assetBaseUrl = process.env.HUGEAMP_ASSET_BASE_URL ?? "https://hugeampkpncms.org";
const content = await loadCompatibilityContent(contentRoot);

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? `${host}:${port}`}`);

  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      researchPages: content.researchPages.length,
      navigation: content.headers.length,
      researchMethods: content.researchMethods.length,
      basicPages: content.basicPages.length,
      bookPages: content.bookPages.length,
      news: content.news.length,
      communityPortals: content.communityPortals.length,
    });
    return;
  }

  if (url.pathname === "/view/rest/get_research_page_access") {
    const records = content.researchByPageId.get(url.searchParams.get("pageid")) ?? [];
    sendJson(response, 200, records.map(toLegacyResearchAccess));
    return;
  }

  if (url.pathname === "/view/rest/get_research_page") {
    const records = content.researchByPageId.get(url.searchParams.get("pageid")) ?? [];
    sendJson(
      response,
      200,
      records.filter((record) => record.mode !== "dev").map(toLegacyResearchPage),
    );
    return;
  }

  if (url.pathname === "/view/rest/get_research_menu") {
    const record = content.headersByNodeId.get(url.searchParams.get("menu"));
    sendJson(response, 200, record ? [toLegacyMenu(record)] : []);
    return;
  }

  if (url.pathname === "/view/rest/get_research_method") {
    const record = content.researchMethodsByNodeId.get(url.searchParams.get("method"));
    sendJson(response, 200, record ? [toLegacyResearchMethod(record)] : []);
    return;
  }

  if (url.pathname === "/rest/directcsv") {
    const records = content.researchByPageId.get(url.searchParams.get("id")) ?? [];
    sendJson(
      response,
      200,
      records.filter((record) => record.mode !== "dev").map(toLegacyDirectCsv),
    );
    return;
  }

  if (url.pathname === "/rest/data") {
    const records = content.researchByPageId.get(url.searchParams.get("pageid")) ?? [];
    sendJson(
      response,
      200,
      records.filter((record) => record.mode !== "dev").map(toLegacyData),
    );
    return;
  }

  if (url.pathname === "/rest/views/news2vueportal") {
    const project = url.searchParams.get("portal");
    sendJson(
      response,
      200,
      content.news.filter((record) => matchesProject(record, project)).map(toLegacyNews),
    );
    return;
  }

  if (url.pathname === "/rest/views/a2f_community_kps") {
    sendJson(
      response,
      200,
      content.communityPortals
        .filter((record) => record.onA2fkp)
        .map(toLegacyCommunityPortal),
    );
    return;
  }

  if (url.pathname === "/rest/views/byor_projects") {
    sendJson(
      response,
      200,
      content.researchPages
        .filter((record) => record.mode !== "dev" && record.showOnByorFront)
        .sort((left, right) => right.drupalNodeId - left.drupalNodeId)
        .map((record) => toLegacyByorProject(record, assetBaseUrl)),
    );
    return;
  }

  if (url.pathname === "/rest/views/help_book") {
    sendJson(response, 200, toLegacyBookToc(content.bookPages));
    return;
  }

  if (url.pathname === "/rest/views/content_by_id") {
    const record = content.pagesByNodeId.get(url.searchParams.get("nid"));
    sendJson(response, 200, record ? [toLegacyContentById(record)] : []);
    return;
  }

  if (url.pathname === "/rest/views/help_book_search") {
    const query = (url.searchParams.get("body") ?? "").toLowerCase();
    const matches = content.bookPages.filter(
      (record) =>
        query &&
        (`${record.title}\n${record.bodyHtml ?? ""}`).toLowerCase().includes(query),
    );
    sendJson(
      response,
      200,
      matches.map((record) => ({ title: record.title, nid: String(record.drupalNodeId) })),
    );
    return;
  }

  if (url.pathname === "/view/rest/get_research_page_dev") {
    sendJson(response, 200, []);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, host, () => {
  console.log(`HuGeAMP compatibility API listening at http://${host}:${port}`);
  console.log(
    `Loaded ${content.researchPages.length} Research Pages, ${content.headers.length} Header Menus, ` +
      `${content.researchMethods.length} Research Methods, ${content.basicPages.length} Basic Pages, ` +
      `${content.bookPages.length} Book Pages, ${content.news.length} News items, and ` +
      `${content.communityPortals.length} Community Portals.`,
  );
});

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(body)}\n`);
}
