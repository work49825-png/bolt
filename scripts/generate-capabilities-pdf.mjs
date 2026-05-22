import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'CAPABILITIES.md');
const pdfPath = path.join(root, 'CAPABILITIES.pdf');

const md = fs.readFileSync(mdPath, 'utf8');

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-');
}

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const margin = 48;
const pageWidth = doc.internal.pageSize.getWidth();
const maxWidth = pageWidth - margin * 2;
let y = margin;

function ensureSpace(height) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + height > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
}

function writeLines(text, { size = 11, style = 'normal', indent = 0, gap = 6 } = {}) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);

  const lines = doc.splitTextToSize(text, maxWidth - indent);
  const lineHeight = size * 1.35;

  for (const line of lines) {
    ensureSpace(lineHeight);
    doc.text(line, margin + indent, y);
    y += lineHeight;
  }
  y += gap;
}

for (const rawLine of md.split(/\r?\n/)) {
  const line = rawLine.trimEnd();

  if (!line.trim()) {
    y += 6;
    continue;
  }

  if (line.startsWith('# ')) {
    writeLines(stripInline(line.slice(2)), { size: 20, style: 'bold', gap: 10 });
    continue;
  }

  if (line.startsWith('## ')) {
    y += 4;
    writeLines(stripInline(line.slice(3)), { size: 14, style: 'bold', gap: 8 });
    continue;
  }

  if (line.startsWith('|')) {
    if (/^\|[-\s|:]+\|$/.test(line.replace(/\s/g, ''))) {
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => stripInline(c.trim()));
    writeLines(cells.join('  |  '), { size: 10, indent: 8, gap: 4 });
    continue;
  }

  if (/^\d+\.\s/.test(line)) {
    writeLines(stripInline(line.replace(/^\d+\.\s\*\*/, '').replace(/\*\*:\s*/, ': ')), {
      size: 10,
      indent: 12,
      gap: 4,
    });
    continue;
  }

  if (line.startsWith('- ')) {
    writeLines(`• ${stripInline(line.slice(2))}`, { size: 10, indent: 12, gap: 4 });
    continue;
  }

  writeLines(stripInline(line), { size: 10, gap: 6 });
}

doc.save(pdfPath);
console.log(`Wrote ${pdfPath}`);
