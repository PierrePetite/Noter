import { JSDOM } from 'jsdom';

/**
 * TipTap JSON Node Types
 */
export interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

export interface TipTapMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface TipTapDocument {
  type: 'doc';
  content: TipTapNode[];
}

/**
 * Options für die HTML-zu-TipTap Konvertierung
 */
export interface ConversionOptions {
  /**
   * Mapping von Bild-Referenzen zu tatsächlichen URLs
   * Key: Synology ref (z.B. "MTczODc0ODI3MjMwOW5z...")
   * Value: Neue URL im System
   */
  imageRefMap?: Map<string, string>;

  /**
   * Wenn true, werden unbekannte HTML-Elemente als Paragraphen behandelt
   */
  fallbackToParagraph?: boolean;
}

/**
 * Konvertiert Synology NoteStation HTML zu TipTap JSON
 */
export function htmlToTiptap(html: string, options: ConversionOptions = {}): TipTapDocument {
  const dom = new JSDOM(html);
  const body = dom.window.document.body;

  const content = convertNodeList(body.childNodes, options);

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

/**
 * Konvertiert eine NodeList zu TipTap Nodes
 */
function convertNodeList(nodes: NodeListOf<ChildNode>, options: ConversionOptions): TipTapNode[] {
  const result: TipTapNode[] = [];

  for (const node of Array.from(nodes)) {
    const converted = convertNode(node as Node, options);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }

  return result;
}

/**
 * Konvertiert einen einzelnen HTML-Node zu TipTap Node(s)
 */
function convertNode(node: Node, options: ConversionOptions): TipTapNode | TipTapNode[] | null {
  // Text-Node
  if (node.nodeType === 3) {
    const text = node.textContent || '';
    if (text.trim() === '') return null;
    return { type: 'text', text };
  }

  // Element-Node
  if (node.nodeType === 1) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return convertHeading(element, options);

      case 'p':
      case 'div':
        return convertParagraph(element, options);

      case 'br':
        return { type: 'hardBreak' };

      case 'ul':
        return convertBulletList(element, options);

      case 'ol':
        return convertOrderedList(element, options);

      case 'li':
        return convertListItem(element, options);

      case 'blockquote':
        return convertBlockquote(element, options);

      case 'pre':
        return convertCodeBlock(element, options);

      case 'code':
        // Inline code wird als Mark behandelt
        return convertInlineCode(element, options);

      case 'a':
        return convertLink(element, options);

      case 'img':
        return convertImage(element, options);

      case 'strong':
      case 'b':
        return applyMark(element, 'bold', options);

      case 'em':
      case 'i':
        return applyMark(element, 'italic', options);

      case 's':
      case 'strike':
      case 'del':
        return applyMark(element, 'strike', options);

      case 'u':
        // TipTap hat kein underline standardmäßig, ignorieren
        return convertNodeList(element.childNodes, options);

      case 'span':
        return convertSpan(element, options);

      case 'table':
        return convertTable(element, options);

      case 'tbody':
      case 'thead':
        // tbody und thead: Inhalt extrahieren (tr Elemente)
        return convertNodeList(element.childNodes, options);

      case 'hr':
        return { type: 'horizontalRule' };

      case 'body':
        return convertNodeList(element.childNodes, options);

      default:
        // Unbekannte Elemente: Inhalt extrahieren
        if (options.fallbackToParagraph !== false) {
          return convertNodeList(element.childNodes, options);
        }
        return null;
    }
  }

  return null;
}

/**
 * Konvertiert Heading (h1-h6)
 */
function convertHeading(element: Element, options: ConversionOptions): TipTapNode {
  const level = parseInt(element.tagName[1]);
  const content = convertInlineNodes(element.childNodes, options);

  return {
    type: 'heading',
    attrs: { level },
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
  };
}

/**
 * Konvertiert Paragraph
 */
function convertParagraph(element: Element, options: ConversionOptions): TipTapNode | null {
  const content = convertInlineNodes(element.childNodes, options);

  // Leere Paragraphen ignorieren
  if (content.length === 0) return null;

  return {
    type: 'paragraph',
    content,
  };
}

/**
 * Konvertiert Bullet List
 */
function convertBulletList(element: Element, options: ConversionOptions): TipTapNode {
  const items = Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((li) => convertListItem(li, options))
    .filter((item): item is TipTapNode => item !== null);

  return {
    type: 'bulletList',
    content: items,
  };
}

/**
 * Konvertiert Ordered List
 */
function convertOrderedList(element: Element, options: ConversionOptions): TipTapNode {
  const items = Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((li) => convertListItem(li, options))
    .filter((item): item is TipTapNode => item !== null);

  return {
    type: 'orderedList',
    content: items,
  };
}

/**
 * Konvertiert List Item
 */
function convertListItem(element: Element, options: ConversionOptions): TipTapNode | null {
  const content = convertNodeList(element.childNodes, options);

  // Wenn der ListItem nur Text enthält, wrappen wir ihn in einen Paragraph
  const wrappedContent = content.map((node) => {
    if (node.type === 'text') {
      return { type: 'paragraph', content: [node] };
    }
    return node;
  });

  if (wrappedContent.length === 0) return null;

  return {
    type: 'listItem',
    content: wrappedContent,
  };
}

/**
 * Konvertiert Blockquote
 */
function convertBlockquote(element: Element, options: ConversionOptions): TipTapNode {
  const content = convertNodeList(element.childNodes, options);

  return {
    type: 'blockquote',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

/**
 * Konvertiert Code Block
 */
function convertCodeBlock(element: Element, _options: ConversionOptions): TipTapNode {
  const text = element.textContent || '';

  return {
    type: 'codeBlock',
    content: [{ type: 'text', text }],
  };
}

/**
 * Konvertiert Inline Code
 */
function convertInlineCode(element: Element, _options: ConversionOptions): TipTapNode[] {
  const text = element.textContent || '';
  return [
    {
      type: 'text',
      text,
      marks: [{ type: 'code' }],
    },
  ];
}

/**
 * Konvertiert Link
 */
function convertLink(element: Element, options: ConversionOptions): TipTapNode[] {
  const href = element.getAttribute('href') || '';
  const content = convertInlineNodes(element.childNodes, options);

  return content.map((node) => ({
    ...node,
    marks: [...(node.marks || []), { type: 'link', attrs: { href } }],
  }));
}

/**
 * Konvertiert Image (Synology-spezifisch)
 */
function convertImage(element: Element, options: ConversionOptions): TipTapNode | null {
  // Synology verwendet "ref" Attribut für Bilder
  const ref = element.getAttribute('ref');
  let src = element.getAttribute('src');

  // Wenn ref vorhanden ist und wir ein Mapping haben, verwende das Mapping
  if (ref && options.imageRefMap) {
    const mappedUrl = options.imageRefMap.get(ref);
    if (mappedUrl) {
      src = mappedUrl;
    }
  }

  // Fallback: externe URLs direkt verwenden
  if (!src || src.includes('transparent.gif')) {
    // Synology verwendet transparent.gif als Platzhalter
    return null;
  }

  const alt = element.getAttribute('alt') || '';

  return {
    type: 'image',
    attrs: {
      src,
      alt,
    },
  };
}

/**
 * Konvertiert Span mit Styles
 */
function convertSpan(element: Element, options: ConversionOptions): TipTapNode[] {
  const content = convertInlineNodes(element.childNodes, options);
  const marks: TipTapMark[] = [];

  // Prüfe auf Synology-spezifische CSS-Klassen
  // const className = element.className;

  // Highlight (Synology verwendet manchmal background-color)
  const style = element.getAttribute('style') || '';
  if (style.includes('background-color') && !style.includes('background-color: transparent')) {
    marks.push({ type: 'highlight' });
  }

  // Wenn keine Marks gefunden wurden, gebe Content direkt zurück
  if (marks.length === 0) {
    return content;
  }

  // Wende Marks auf alle Text-Nodes an
  return content.map((node) => ({
    ...node,
    marks: [...(node.marks || []), ...marks],
  }));
}

/**
 * Wendet eine Mark (bold, italic, etc.) auf alle Child-Nodes an
 */
function applyMark(element: Element, markType: string, options: ConversionOptions): TipTapNode[] {
  const content = convertInlineNodes(element.childNodes, options);

  return content.map((node) => ({
    ...node,
    marks: [...(node.marks || []), { type: markType }],
  }));
}

/**
 * Konvertiert Inline-Nodes (für Paragraph, Heading, etc.)
 */
function convertInlineNodes(nodes: NodeListOf<ChildNode>, options: ConversionOptions): TipTapNode[] {
  const result: TipTapNode[] = [];

  for (const node of Array.from(nodes)) {
    if (node.nodeType === 3) {
      // Text-Node
      const text = node.textContent || '';
      if (text.length > 0) {
        result.push({ type: 'text', text });
      }
    } else if (node.nodeType === 1) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Inline-Elemente
      if (['strong', 'b', 'em', 'i', 's', 'strike', 'del', 'u', 'code', 'a', 'span', 'img'].includes(tagName)) {
        const converted = convertNode(element, options);
        if (converted) {
          if (Array.isArray(converted)) {
            result.push(...converted);
          } else {
            result.push(converted);
          }
        }
      } else if (tagName === 'br') {
        result.push({ type: 'hardBreak' });
      } else {
        // Block-Element in Inline-Context: Inhalt extrahieren
        const inlineContent = convertInlineNodes(element.childNodes, options);
        result.push(...inlineContent);
      }
    }
  }

  return result;
}

/**
 * Konvertiert Table
 */
function convertTable(element: Element, options: ConversionOptions): TipTapNode {
  const rows: TipTapNode[] = [];

  // Verarbeite thead und tbody
  for (const child of Array.from(element.children)) {
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'thead' || tagName === 'tbody') {
      // Verarbeite alle tr Elemente in thead/tbody
      for (const tr of Array.from(child.children)) {
        if (tr.tagName.toLowerCase() === 'tr') {
          const row = convertTableRow(tr, tagName === 'thead', options);
          if (row) rows.push(row);
        }
      }
    } else if (tagName === 'tr') {
      // Direkte tr Elemente (ohne thead/tbody)
      const row = convertTableRow(child, false, options);
      if (row) rows.push(row);
    }
  }

  return {
    type: 'table',
    content: rows.length > 0 ? rows : [
      {
        type: 'tableRow',
        content: [
          {
            type: 'tableCell',
            content: [{ type: 'paragraph' }],
          },
        ],
      },
    ],
  };
}

/**
 * Konvertiert Table Row
 */
function convertTableRow(element: Element, isHeader: boolean, options: ConversionOptions): TipTapNode | null {
  const cells: TipTapNode[] = [];

  for (const child of Array.from(element.children)) {
    const tagName = child.tagName.toLowerCase();

    if (tagName === 'td' || tagName === 'th') {
      const cell = convertTableCell(child, tagName === 'th' || isHeader, options);
      if (cell) cells.push(cell);
    }
  }

  if (cells.length === 0) return null;

  return {
    type: 'tableRow',
    content: cells,
  };
}

/**
 * Konvertiert Table Cell (td oder th)
 */
function convertTableCell(element: Element, isHeader: boolean, options: ConversionOptions): TipTapNode | null {
  const content = convertNodeList(element.childNodes, options);

  // Wenn keine Content-Nodes vorhanden sind, füge einen leeren Paragraph hinzu
  const cellContent = content.length > 0
    ? content.map(node => {
        // Wenn der Node kein Block-Element ist, wrappen wir ihn in einen Paragraph
        if (node.type === 'text') {
          return { type: 'paragraph', content: [node] };
        }
        return node;
      })
    : [{ type: 'paragraph' }];

  return {
    type: isHeader ? 'tableHeader' : 'tableCell',
    content: cellContent,
  };
}

/**
 * Hilfsfunktion: Bereinigt HTML vor der Konvertierung
 */
export function cleanHtml(html: string): string {
  // Entferne Synology-spezifische Wrapper
  let cleaned = html;

  // Entferne leere style-Attribute
  cleaned = cleaned.replace(/\s+style=""/g, '');

  // Entferne mehrfache Leerzeichen
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}
