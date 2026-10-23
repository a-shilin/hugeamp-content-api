import assert from "node:assert/strict";
import test from "node:test";

import {
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

const researchPage = {
  title: "Example",
  legacyAssetOwnerId: 32,
  bodyHtml: null,
  pageId: "example",
  researchMethodId: null,
  headerId: "615",
  dataTableFormat: "{\"first page\": true}",
  dataTableLegendHtml: null,
  numberOfRows: 10,
  filters: null,
  dataVisualizer: null,
  visualizerConfiguration: null,
  mode: "public",
  isProjectLandingPage: false,
  dataVisualizerLegendHtml: null,
  dataPoints: null,
  dataPointsListLabels: null,
  pageStyle: "body { color: black; }",
  apiParameters: null,
  dataType: "csv",
  isDataPointDynamic: false,
  filterWidth: "none",
  dataComparisonFormat: null,
  customVisualizer: null,
  displayOnKp: true,
};

test("maps canonical Research Pages to the legacy Drupal field shape", () => {
  const result = toLegacyResearchPage(researchPage);
  assert.equal(result.uid, "32");
  assert.equal(result.body, false);
  assert.equal(result.field_page_id, "example");
  assert.equal(result.field_number_of_rows, "10");
  assert.equal(result.field_landing_page, "0");
  assert.equal(result.field_is_api, "0");
  assert.equal(result.field_dev_id, false);
  assert.equal(result.field_dev_password, false);
});

test("maps the lightweight access response", () => {
  assert.deepEqual(toLegacyResearchAccess(researchPage), {
    title: "Example",
    field_page_mode: "public",
    field_page_id: "example",
    field_display_on_kp: "1",
  });
});

test("maps Header Menus without parsing authored JSON", () => {
  assert.deepEqual(
    toLegacyMenu({ title: "Navigation", menu: "{bad json", styleCss: null, logoHtml: "<img>" }),
    {
      title: "Navigation",
      field_menu: "{bad json",
      field_portal_style: false,
      field_header_logo: "<img>",
    },
  );
});

test("maps Research Methods to the legacy Drupal field shape", () => {
  assert.deepEqual(
    toLegacyResearchMethod({ title: "Method", bodyHtml: "<p>Description</p>" }),
    { title: "Method", body: "<p>Description</p>" },
  );
});

test("maps direct CSV and data responses from Research Pages", () => {
  const record = {
    ...researchPage,
    bodyHtml: "<p>Description</p>",
    dataPoints: "gene,pvalue\nTCF7L2,0.001",
    dataTableFormat: '{"top rows":["gene"]}',
    filters: '{"field":"gene"}',
    visualizerConfiguration: null,
  };

  assert.deepEqual(toLegacyDirectCsv(record), {
    field_data_points: "gene,pvalue\nTCF7L2,0.001",
    field_data_table_format: '{"top rows":["gene"]}',
    field_filters: '{"field":"gene"}',
    field_visualizer_configuration: false,
    body: "<p>Description</p>",
  });
  assert.deepEqual(toLegacyData(record), {
    field_data_points: "gene,pvalue\nTCF7L2,0.001",
    field_data_table_format: '{"top rows":["gene"]}',
  });
});

test("maps promoted BYOR projects and legacy public asset URLs", () => {
  assert.deepEqual(
    toLegacyByorProject({
      title: "Example project",
      pageId: "example",
      projectSummary: "Summary",
      urlToPage: "/research.html?pageid=example",
      byorFrontImage: {
        sourceUri: "public://2023-03/Screen Shot.png",
      },
    }),
    {
      title: "Example project",
      field_image_byor_front:
        "https://hugeampkpncms.org/sites/default/files/2023-03/Screen%20Shot.png",
      field_byor_project_summary: "Summary",
      field_page_id: "example",
      field_url_to_page: "/research.html?pageid=example",
    },
  );
});

test("maps News summaries and thumbnail HTML to the legacy list shape", () => {
  assert.deepEqual(
    toLegacyNews({
      drupalNodeId: 42,
      title: "News",
      summary: "Summary",
      project: "msk, mskkp",
      thumbnailHtml: '<p><img alt="" src="https://example.org/image.png"></p>',
    }),
    {
      title: "News",
      body: "Summary",
      view_node: '<a href="/node/42" hreflang="en">view</a>',
      nid: "42",
      field_portals: "msk, mskkp",
      field_image: "https://example.org/image.png",
    },
  );
  assert.equal(matchesProject({ project: "msk, mskkp" }, "mskkp"), true);
  assert.equal(matchesProject({ project: "msk, mskkp" }, "bone"), false);
});

test("maps Community Portals and node content to legacy shapes", () => {
  const record = {
    title: "Portal",
    bodyHtml: "<p>Body</p>",
    portalAddress: "https://example.org",
  };
  assert.deepEqual(toLegacyCommunityPortal(record), {
    title: "Portal",
    body: "<p>Body</p>",
    field_portal_address: "https://example.org",
  });
  assert.deepEqual(toLegacyContentById(record), {
    title: "Portal",
    body: "<p>Body</p>",
  });
});

test("maps ordered Book Pages to the legacy table-of-contents shape", () => {
  const records = [
    {
      drupalNodeId: 1,
      bookId: 1,
      parentId: null,
      depth: 1,
      weight: 0,
      outlinePath: [1],
      title: "Guide",
    },
    {
      drupalNodeId: 2,
      bookId: 1,
      parentId: 1,
      depth: 2,
      weight: 0,
      outlinePath: [1, 2],
      title: "Chapter",
    },
    {
      drupalNodeId: 3,
      bookId: 1,
      parentId: 2,
      depth: 3,
      weight: 0,
      outlinePath: [1, 2, 3],
      title: "Page",
    },
  ];
  assert.deepEqual(toLegacyBookToc(records), [
    {
      title_1: "Guide",
      nid_1: "1",
      title_2: "Chapter",
      nid_2: "2",
      title: "Chapter",
      nid: "2",
    },
    {
      title_1: "Guide",
      nid_1: "1",
      title_2: "Chapter",
      nid_2: "2",
      title: "Page",
      nid: "3",
    },
  ]);
});
