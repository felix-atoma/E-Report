import { parse, HTMLElement, Node, NodeType } from 'node-html-parser';

/**
 * Corps d'une épreuve : HTML simple produit par l'IA puis modifié par le professeur dans l'éditeur.
 * On ne garde que des balises de mise en forme sûres (le contenu est affiché à l'administration) :
 * tout le reste est retiré, sans perdre le texte.
 */
const ALLOWED = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'sup', 'sub',
  'h2', 'h3', 'h4', 'ol', 'ul', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);
/** Balises supprimées avec leur contenu */
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'head', 'title', 'noscript', 'template']);
/** Éditeurs de texte du navigateur : <div> = paragraphe, <h1> = titre */
const RENAME: Record<string, string> = { div: 'p', h1: 'h2', h5: 'h4', h6: 'h4' };

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cleanNode(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) return escapeText(node.text);
  if (node.nodeType !== NodeType.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  let tag = (el.rawTagName ?? '').toLowerCase();
  if (DROP.has(tag)) return '';
  tag = RENAME[tag] ?? tag;
  const inner = el.childNodes.map(cleanNode).join('');
  if (!ALLOWED.has(tag)) return inner;        // balise inconnue : on garde le texte
  if (tag === 'br') return '<br>';
  // Fusion de cellules : seuls attributs conservés
  let attrs = '';
  if (tag === 'td' || tag === 'th') {
    for (const a of ['colspan', 'rowspan']) {
      const v = el.getAttribute(a);
      if (v && /^\d{1,2}$/.test(v)) attrs += ` ${a}="${v}"`;
    }
  }
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

export function sanitizeExamHtml(html: string | null | undefined): string {
  if (!html) return '';
  const root = parse(String(html), { comment: false });
  return root.childNodes.map(cleanNode).join('').trim();
}

export { parse as parseHtml };
