// Server-side only. PPTX text extraction via JSZip — reads slide XML, pulls <a:t> text nodes.
// Speaker notes are not extracted in v1.

export interface PptxExtractionResult {
  text: string;
  slides?: number;
  warnings: string[];
}

const A_T_REGEX = /<a:t[^>]*>([^<]*)<\/a:t>/g;
const XML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&#xA;": "\n",
  "&#xD;": "\r",
};

function decodeXmlEntities(str: string): string {
  return str.replace(/&[^;]+;/g, (entity) => XML_ENTITY_MAP[entity] ?? entity);
}

function extractTextFromSlideXml(xml: string): string {
  const texts: string[] = [];
  let match;
  A_T_REGEX.lastIndex = 0;
  while ((match = A_T_REGEX.exec(xml)) !== null) {
    const t = decodeXmlEntities(match[1]).trim();
    if (t) texts.push(t);
  }
  return texts.join(" ");
}

export async function extractPptxText(
  buffer: ArrayBuffer,
): Promise<PptxExtractionResult> {
  const warnings: string[] = [];

  let JSZip: typeof import("jszip");
  try {
    JSZip = (await import("jszip")).default as unknown as typeof import("jszip");
  } catch {
    return {
      text: "",
      warnings: ["PPTX parsing library failed to load. Please paste your brief as text."],
    };
  }

  let zip: import("jszip");
  try {
    zip = await (JSZip as unknown as { loadAsync(data: ArrayBuffer): Promise<import("jszip")> }).loadAsync(buffer);
  } catch {
    return {
      text: "",
      warnings: ["PPTX file could not be opened. The file may be corrupted or not a valid PowerPoint file."],
    };
  }

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    return {
      text: "",
      slides: 0,
      warnings: ["No slides found in this PPTX file."],
    };
  }

  const slideTexts: string[] = [];
  for (const slideName of slideFiles) {
    const xml = await zip.files[slideName].async("text");
    const slideText = extractTextFromSlideXml(xml);
    if (slideText) slideTexts.push(slideText);
  }

  const text = slideTexts.join("\n\n").trim();

  if (!text) {
    warnings.push(
      "No extractable text found in this PowerPoint. Slides may contain only images or embedded objects.",
    );
  }

  warnings.push("PowerPoint speaker notes are not extracted in v1.");

  return { text, slides: slideFiles.length, warnings };
}
