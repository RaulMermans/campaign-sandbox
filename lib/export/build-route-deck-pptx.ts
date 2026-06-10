// Server-side only. Generates a minimal valid OOXML (.pptx) route deck from a
// CampaignReport using JSZip — PPTX files are ZIP archives of XML parts, and
// jszip is already a project dependency (see lib/extract/extract-pptx-text.ts),
// so no new dependency is introduced.
//
// The deck is a deterministic rendering of report data already produced by
// buildCampaignReport. No LLM calls, no invented content — every slide states
// the same caveats and strategic-estimate framing as the markdown/HTML reports.

import type { CampaignReport } from "@/lib/export/build-campaign-report";

const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";

// 16:9 slide size in EMUs (914400 EMU per inch — 13.333in x 7.5in).
const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

const TITLE_OFFSET = { x: 457200, y: 274638 };
const TITLE_EXTENT = { cx: 11277600, cy: 914400 };
const BODY_OFFSET = { x: 457200, y: 1325563 };
const BODY_EXTENT = { cx: 11277600, cy: 5181600 };

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type SlideBodyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string };

function paragraphXml(block: SlideBodyBlock): string {
  const text = escapeXml(block.text);
  switch (block.kind) {
    case "heading":
      return `<a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="1600" b="1"/><a:t>${text}</a:t></a:r></a:p>`;
    case "bullet":
      return `<a:p><a:pPr marL="228600" indent="-228600"><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="1400"/><a:t>${text}</a:t></a:r></a:p>`;
    case "paragraph":
    default:
      return `<a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="1400"/><a:t>${text}</a:t></a:r></a:p>`;
  }
}

function slideXml(title: string, body: SlideBodyBlock[]): string {
  const bodyParagraphs = body.map(paragraphXml).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${TITLE_OFFSET.x}" y="${TITLE_OFFSET.y}"/><a:ext cx="${TITLE_EXTENT.cx}" cy="${TITLE_EXTENT.cy}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="2800" b="1"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Body"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${BODY_OFFSET.x}" y="${BODY_OFFSET.y}"/><a:ext cx="${BODY_EXTENT.cx}" cy="${BODY_EXTENT.cy}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr>
          <a:lstStyle/>
          ${bodyParagraphs}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sld>`;
}

const SLIDE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Campaign Sandbox Theme">
  <a:themeElements>
    <a:clrScheme name="Campaign Sandbox">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1C1917"/></a:dk2>
      <a:lt2><a:srgbClr val="F5F5F4"/></a:lt2>
      <a:accent1><a:srgbClr val="44403C"/></a:accent1>
      <a:accent2><a:srgbClr val="78716C"/></a:accent2>
      <a:accent3><a:srgbClr val="A8A29E"/></a:accent3>
      <a:accent4><a:srgbClr val="D6D3D1"/></a:accent4>
      <a:accent5><a:srgbClr val="EA580C"/></a:accent5>
      <a:accent6><a:srgbClr val="0F766E"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Campaign Sandbox">
      <a:majorFont>
        <a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Campaign Sandbox">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;

const SLIDE_MASTER_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  </p:clrMapOvr>
</p:sldLayout>`;

const SLIDE_LAYOUT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const PACKAGE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

function buildCorePropsXml(report: CampaignReport): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(`${report.brandName} — Creative Route Deck`)}</dc:title>
  <dc:creator>Campaign Sandbox</dc:creator>
  <cp:lastModifiedBy>Campaign Sandbox</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropsXml(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Campaign Sandbox</Application>
  <Slides>${slideCount}</Slides>
</Properties>`;
}

function buildPresentationXml(slideCount: number): string {
  const sldIdEntries = Array.from({ length: slideCount }, (_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${2 + i}"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>${sldIdEntries}</p:sldIdLst>
  <p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function buildPresentationRelsXml(slideCount: number): string {
  const slideEntries = Array.from({ length: slideCount }, (_, i) =>
    `<Relationship Id="rId${2 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideEntries}
</Relationships>`;
}

function buildContentTypesXml(slideCount: number): string {
  const slideOverrides = Array.from({ length: slideCount }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${CT_NS}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${slideOverrides}
</Types>`;
}

// ---------------------------------------------------------------------------
// Slide content — deterministic, derived directly from the report. Mirrors the
// language and framing used in the markdown/HTML exports (same caveats, same
// "strategic estimate" / "not a prediction" framing).
// ---------------------------------------------------------------------------

function titleSlide(report: CampaignReport): { title: string; body: SlideBodyBlock[] } {
  return {
    title: `${report.brandName} — Creative Route Deck`,
    body: [
      { kind: "paragraph", text: report.capsuleDescription },
      { kind: "heading", text: "What this deck is" },
      { kind: "bullet", text: "A strategic planning artifact summarizing simulated creative routes for human review." },
      { kind: "bullet", text: "Route scores are strategic estimates, not predictions of real-world performance." },
      { kind: "bullet", text: "Synthetic audience reactions are planning hypotheses — never real research." },
      { kind: "paragraph", text: report.caveat },
    ],
  };
}

function decisionSlide(report: CampaignReport): { title: string; body: SlideBodyBlock[] } {
  const { decisionSummary } = report;
  const body: SlideBodyBlock[] = [
    { kind: "heading", text: "Recommended route" },
    { kind: "bullet", text: decisionSummary.recommendedRouteName },
    { kind: "bullet", text: decisionSummary.whyItWins },
  ];

  if (decisionSummary.runnerUpStrength) {
    body.push({ kind: "heading", text: "Runner-up strength" });
    body.push({ kind: "bullet", text: decisionSummary.runnerUpStrength });
  }

  body.push({ kind: "heading", text: "Biggest tradeoff" });
  body.push({ kind: "bullet", text: decisionSummary.biggestTradeoff });

  body.push({ kind: "heading", text: "Primary risk" });
  body.push({ kind: "bullet", text: decisionSummary.riskType });

  if (decisionSummary.closeScoreNotice) {
    body.push({ kind: "heading", text: "Close-score notice" });
    body.push({ kind: "bullet", text: decisionSummary.closeScoreNotice });
  }

  body.push({ kind: "paragraph", text: "Human selection is required before this plan moves to final synthesis." });

  return { title: "Decision Summary", body };
}

function routeSlide(
  route: CampaignReport["routes"][number],
  report: CampaignReport,
): { title: string; body: SlideBodyBlock[] } {
  const taxonomy = report.riskTaxonomy.find((t) => t.routeId === route.id);
  const isRecommended = route.id === report.recommendedRouteId;

  const body: SlideBodyBlock[] = [
    { kind: "paragraph", text: `${route.strategicRole}${isRecommended ? " · Recommended route" : ""}` },
    { kind: "heading", text: "Killer line" },
    { kind: "bullet", text: route.killerLine },
    { kind: "heading", text: "Enemy" },
    { kind: "bullet", text: route.enemy },
  ];

  if (route.score != null) {
    const scoreText = route.rankingLabel
      ? `${route.score.toFixed(1)} / 5 — ${route.rankingLabel} (strategic estimate, not a prediction)`
      : `${route.score.toFixed(1)} / 5 (strategic estimate, not a prediction)`;
    body.push({ kind: "heading", text: "Strategic estimate" });
    body.push({ kind: "bullet", text: scoreText });
  }

  if (route.keyStrengths.length > 0) {
    body.push({ kind: "heading", text: "Key strengths" });
    for (const strength of route.keyStrengths) body.push({ kind: "bullet", text: strength });
  }

  if (route.keyRisks.length > 0) {
    body.push({ kind: "heading", text: "Key risks" });
    for (const risk of route.keyRisks) body.push({ kind: "bullet", text: risk });
  }

  if (taxonomy) {
    const riskLine = taxonomy.secondaryRiskType
      ? `${taxonomy.severity} · ${taxonomy.primaryRiskType} (secondary: ${taxonomy.secondaryRiskType})`
      : `${taxonomy.severity} · ${taxonomy.primaryRiskType}`;
    body.push({ kind: "heading", text: "Risk classification" });
    body.push({ kind: "bullet", text: riskLine });
    body.push({ kind: "bullet", text: taxonomy.explanation });
  }

  return { title: route.name, body };
}

function caveatSlide(report: CampaignReport): { title: string; body: SlideBodyBlock[] } {
  return {
    title: "Caveats & Required Review",
    body: [
      { kind: "heading", text: "Synthetic data" },
      { kind: "paragraph", text: report.syntheticCaveat },
      { kind: "heading", text: "Legal & substantiation" },
      { kind: "paragraph", text: report.legalCaveat },
      { kind: "heading", text: "Human judgment" },
      { kind: "paragraph", text: "Human selection is required before final plan synthesis. This deck supports a creative decision; it does not replace human judgment." },
      { kind: "paragraph", text: report.caveat },
    ],
  };
}

function buildSlides(report: CampaignReport): Array<{ title: string; body: SlideBodyBlock[] }> {
  return [
    titleSlide(report),
    decisionSlide(report),
    ...report.routes.map((route) => routeSlide(route, report)),
    caveatSlide(report),
  ];
}

/**
 * Builds a minimal valid OOXML (.pptx) presentation summarizing the campaign
 * report's creative routes for offline review and circulation. Deterministic —
 * no LLM calls. Every slide repeats the same caveats shown in the markdown and
 * HTML exports so the artifact cannot be separated from its required framing.
 */
export async function buildRouteDeckPptx(report: CampaignReport): Promise<Uint8Array> {
  let JSZip: typeof import("jszip");
  try {
    JSZip = (await import("jszip")).default as unknown as typeof import("jszip");
  } catch {
    throw new Error("PPTX generation library failed to load.");
  }

  const slides = buildSlides(report);
  const zip = new (JSZip as unknown as { new (): import("jszip") })();

  zip.file("[Content_Types].xml", buildContentTypesXml(slides.length));
  zip.file("_rels/.rels", PACKAGE_RELS_XML);
  zip.file("docProps/core.xml", buildCorePropsXml(report));
  zip.file("docProps/app.xml", buildAppPropsXml(slides.length));

  zip.file("ppt/presentation.xml", buildPresentationXml(slides.length));
  zip.file("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slides.length));

  zip.file("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS_XML);

  zip.file("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS_XML);

  zip.file("ppt/theme/theme1.xml", THEME_XML);

  slides.forEach((slide, i) => {
    const n = i + 1;
    zip.file(`ppt/slides/slide${n}.xml`, slideXml(slide.title, slide.body));
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, SLIDE_RELS_XML);
  });

  return zip.generateAsync({ type: "uint8array" });
}
