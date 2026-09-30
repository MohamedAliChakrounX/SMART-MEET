import os
import re
import sys
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

# Translation dictionary to clean box-drawing characters for monospaced blocks
BOX_DRAWING_TRANSLATION = {
    '┌': '+', '┐': '+', '└': '+', '┘': '+',
    '┬': '+', '┴': '+', '┼': '+',
    '├': '+', '┤': '+',
    '─': '-', '│': '|',
    '═': '=', '║': '|',
    '╔': '+', '╗': '+', '╚': '+', '╝': '+',
    '╒': '+', '╕': '+', '╘': '+', '╛': '+',
    '╓': '+', '╢': '+', '╙': '+', '╜': '+',
    '╞': '+', '╡': '+', '╪': '+',
    '▲': '^', '▼': 'v', '◄': '<', '►': '>',
    '→': '->', '←': '<-', '↔': '<->',
}

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to calculate the total page count dynamically and 
    render running headers and footers with page numbers.
    """
    chapter_header = "RAPPORT ACADÉMIQUE — CHAPITRE 1"
    chapter_subheader = "Transcription & Diarisation des Locuteurs"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # We don't draw headers and footers on the cover page
        if self._pageNumber == 1:
            return

        self.saveState()
        
        # Color Palette
        navy = colors.HexColor('#1E293B')
        slate = colors.HexColor('#64748B')
        light_gray = colors.HexColor('#E2E8F0')

        # Header Text
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(navy)
        self.drawString(54, 800, self.chapter_header)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(slate)
        self.drawRightString(541, 800, self.chapter_subheader)
        
        # Header Line
        self.setStrokeColor(light_gray)
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)

        # Footer Line
        self.line(54, 52, 541, 52)

        # Footer Text
        self.setFont("Helvetica", 8)
        self.setFillColor(slate)
        self.drawString(54, 38, "Meeting-IA-SFM — Plateforme de Réunion IA")
        
        page_text = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(541, 38, page_text)
        
        self.restoreState()


def clean_plain_text(text):
    """Replaces non-ASCII symbols with text representations for Preformatted code blocks."""
    text = text.replace('✅', '[OK]')
    text = text.replace('❌', '[X]')
    for uni, asc in BOX_DRAWING_TRANSLATION.items():
        text = text.replace(uni, asc)
    return text


def text_to_html(text):
    """Converts special characters to ReportLab Paragraph HTML tags."""
    # Escape HTML special chars (except we build our own safe tags)
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # Mathematical subscripts/superscripts
    text = text.replace('o₁', 'o<sub>1</sub>')
    text = text.replace('o₂', 'o<sub>2</sub>')
    text = text.replace('oT', 'o<sub>T</sub>')
    text = text.replace('W*', 'W<sup>*</sup>')
    text = text.replace('QK^T', 'QK<sup>T</sup>')
    text = text.replace('&amp;radic;d_k', '&radic;d<sub>k</sub>')
    text = text.replace('&radic;d_k', '&radic;d<sub>k</sub>')
    text = text.replace('d_k', 'd<sub>k</sub>')
    
    # Custom Behavioral Report Math variables
    text = text.replace('P_i', 'P<sub>i</sub>')
    text = text.replace('P_j', 'P<sub>j</sub>')
    text = text.replace('T_i', 'T<sub>i</sub>')
    text = text.replace('T_j', 'T<sub>j</sub>')
    text = text.replace('M_i', 'M<sub>i</sub>')
    text = text.replace('F_i', 'F<sub>i</sub>')
    text = text.replace('K_i', 'K<sub>i</sub>')
    text = text.replace('S_i', 'S<sub>i</sub>')
    text = text.replace('H_i', 'H<sub>i</sub>')
    text = text.replace('E_i', 'E<sub>i</sub>')
    text = text.replace('EA_i', 'EA<sub>i</sub>')
    text = text.replace('L_i', 'L<sub>i</sub>')
    text = text.replace('S_jitter,i', 'S<sub>jitter,i</sub>')
    text = text.replace('S_shimmer,i', 'S<sub>shimmer,i</sub>')
    text = text.replace('S_jitter, i', 'S<sub>jitter, i</sub>')
    text = text.replace('S_shimmer, i', 'S<sub>shimmer, i</sub>')
    text = text.replace('S_jitter_i', 'S<sub>jitter, i</sub>')
    text = text.replace('S_shimmer_i', 'S<sub>shimmer, i</sub>')
    text = text.replace('I_made,i', 'I<sub>made,i</sub>')
    text = text.replace('I_suffered,i', 'I<sub>suffered,i</sub>')
    text = text.replace('F_0,mean', 'F<sub>0,mean</sub>')
    text = text.replace('F_0,range', 'F<sub>0,range</sub>')
    text = text.replace('mu_P', '&mu;<sub>P</sub>')
    text = text.replace('N^2', 'N<sup>2</sup>')
    
    # Clean checkmarks to beautifully styled tags
    text = text.replace('✅', '<font color="#10B981"><b>[OK]</b></font>')
    text = text.replace('❌', '<font color="#EF4444"><b>[X]</b></font>')
    
    return text


def try_parse_table(block_lines):
    """
    Tries to parse a block of lines as a structured data table.
    Returns a dictionary of title, headers, and rows if successful, else None.
    """
    content_lines = []
    has_separator = False
    
    for line in block_lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        if line_stripped.startswith('┌') or line_stripped.startswith('└'):
            continue
        
        if line_stripped.startswith('│') or line_stripped.startswith('║'):
            line_stripped = line_stripped[1:]
        if line_stripped.endswith('│') or line_stripped.endswith('║'):
            line_stripped = line_stripped[:-1]
            
        line_stripped = line_stripped.strip()
        if not line_stripped:
            continue
            
        # Check if separator line
        if all(c in '─ ╌' for c in line_stripped.replace(' ', '')) and len(line_stripped) > 5:
            has_separator = True
            continue
            
        content_lines.append(line_stripped)
        
    if not has_separator or not content_lines:
        return None
        
    parsed_rows = []
    for line in content_lines:
        parts = re.split(r'\s{2,}', line)
        parts = [p.strip() for p in parts if p.strip()]
        if parts:
            parsed_rows.append(parts)
            
    if not parsed_rows:
        return None
        
    col_counts = [len(row) for row in parsed_rows]
    most_common_count = max(set(col_counts), key=col_counts.count)
    
    if most_common_count < 3:
        return None
        
    matching_rows_pct = sum(1 for c in col_counts if c == most_common_count) / len(col_counts)
    if matching_rows_pct < 0.6:
        return None
        
    headers = parsed_rows[0]
    data_rows = parsed_rows[1:]
    
    table_title = None
    if len(headers) == 1:
        table_title = headers[0]
        if data_rows:
            headers = data_rows[0]
            data_rows = data_rows[1:]
            
    cleaned_rows = []
    for row in data_rows:
        if len(row) < len(headers):
            row = row + [''] * (len(headers) - len(row))
        elif len(row) > len(headers):
            row = row[:len(headers)]
        cleaned_rows.append(row)
        
    return {
        'title': table_title,
        'headers': headers,
        'rows': cleaned_rows
    }


def parse_document(filepath):
    """
    Parses the academic report document into typed blocks for rendering.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    parsed_items = []
    i = 0
    n = len(lines)
    
    while i < n:
        line = lines[i].rstrip()
        
        if not line:
            i += 1
            continue
            
        # 1. Title Block (Main Cover page element)
        if '╔' in line and '═' in line:
            title_lines = []
            i += 1
            while i < n and '╚' not in lines[i]:
                title_line = lines[i].strip('║ \n\r')
                if title_line:
                    title_lines.append(title_line)
                i += 1
            i += 1
            
            chapter = title_lines[0] if len(title_lines) > 0 else ""
            title = title_lines[1] if len(title_lines) > 1 else ""
            subtitle = title_lines[2] if len(title_lines) > 2 else ""
            parsed_items.append({
                'type': 'title_block',
                'chapter': chapter,
                'title': title,
                'subtitle': subtitle
            })
            continue

        # 2. Cover Page Metadata
        if line.startswith("Projet :") or line.startswith("Filière :") or line.startswith("Année académique :"):
            meta = {}
            while i < n and (lines[i].startswith("Projet :") or lines[i].startswith("Filière :") or lines[i].startswith("Année académique :")):
                parts = lines[i].split(":", 1)
                meta[parts[0].strip()] = parts[1].strip()
                i += 1
            parsed_items.append({
                'type': 'metadata',
                'data': meta
            })
            continue

        # 3. H1 Headings (surrounded by horizontal rules)
        if i + 2 < n and (all(c in '═' for c in line.strip()) or all(c in '─' for c in line.strip())) and len(line.strip()) > 10:
            heading_text = lines[i+1].strip()
            next_line = lines[i+2].rstrip()
            if (all(c in '═' for c in next_line.strip()) or all(c in '─' for c in next_line.strip())) and len(next_line.strip()) > 10:
                parsed_items.append({
                    'type': 'h1',
                    'text': heading_text
                })
                i += 3
                continue

        # 4. H2 Headings (followed by horizontal rule)
        if i + 1 < n and len(line.strip()) > 0:
            next_line = lines[i+1].rstrip()
            if len(next_line.strip()) > 10 and all(c in '─' for c in next_line.strip()):
                parsed_items.append({
                    'type': 'h2',
                    'text': line.strip()
                })
                i += 2
                continue

        # 5. Tables and Diagrams
        if line.strip().startswith('┌') and line.strip().endswith('┐'):
            block_lines = []
            block_lines.append(line)
            i += 1
            while i < n and not (lines[i].strip().startswith('└') and lines[i].strip().endswith('┘')):
                block_lines.append(lines[i].rstrip())
                i += 1
            if i < n:
                block_lines.append(lines[i].rstrip())
                i += 1
            
            # Check nested boxes
            is_diagram = False
            for bl in block_lines:
                if '┌' in bl[5:] or '┐' in bl[5:] or '└' in bl[5:] or '┘' in bl[5:]:
                    is_diagram = True
                    break
            
            table_info = None if is_diagram else try_parse_table(block_lines)
            if table_info:
                parsed_items.append({
                    'type': 'table',
                    'title': table_info['title'],
                    'headers': table_info['headers'],
                    'rows': table_info['rows']
                })
            else:
                parsed_items.append({
                    'type': 'diagram',
                    'text': '\n'.join(block_lines)
                })
            continue

        # 6. Code block (starts with indentation and code keywords)
        if line.startswith('      ') and (('=' in line and '(' in line) or ('def ' in line) or ('model =' in line) or ('np.' in line) or ('self.' in line)):
            code_lines = []
            while i < n and (lines[i].startswith('      ') or not lines[i].strip()):
                code_lines.append(lines[i].rstrip('\n\r'))
                i += 1
            while code_lines and not code_lines[-1].strip():
                code_lines.pop()
            parsed_items.append({
                'type': 'code',
                'text': '\n'.join(code_lines)
            })
            continue

        # 7. Bullet Lists (including numbered indices like 1. 2.1, (1), etc.)
        bullet_match = re.match(r'^\s*([•\-*]|\(\d+\)|[a-z]\)|\d+(?:\.\d+)*\.?)\s+(.*)$', line)
        if bullet_match:
            bullet_char = bullet_match.group(1)
            bullet_text = bullet_match.group(2)
            i += 1
            # Gather consecutive lines belonging to the same list item
            while i < n and lines[i].startswith('      ') and not re.match(r'^\s*([•\-*]|\(\d+\)|[a-z]\)|\d+(?:\.\d+)*\.?)\s+', lines[i]):
                if lines[i].strip().startswith('┌') or 'def ' in lines[i] or 'model =' in lines[i]:
                    break
                bullet_text += " " + lines[i].strip()
                i += 1
            parsed_items.append({
                'type': 'bullet',
                'bullet_char': bullet_char,
                'text': bullet_text
            })
            continue

        # 8. Standard Paragraph
        paragraph_text = line.strip()
        i += 1
        while i < n and lines[i].strip() and not lines[i].strip().startswith('┌'):
            next_l = lines[i].rstrip()
            if i + 1 < n:
                next_next_l = lines[i+1].rstrip()
                if (all(c in '═─' for c in next_l.strip()) and len(next_l.strip()) > 10) or (all(c in '─' for c in next_next_l.strip()) and len(next_next_l.strip()) > 10):
                    break
            if re.match(r'^\s*([•\-*]|\(\d+\)|[a-z]\)|\d+(?:\.\d+)*\.?)\s+', next_l):
                break
            if '╔' in next_l or next_l.startswith('      ') and (('=' in next_l and '(' in next_l) or ('def ' in next_l)):
                break
            paragraph_text += " " + next_l.strip()
            i += 1
        
        parsed_items.append({
            'type': 'paragraph',
            'text': paragraph_text
        })
        
    return parsed_items


def build_pdf(parsed_items, output_path):
    """
    Builds the beautiful PDF document using ReportLab.
    """
    # Find chapter details to update header dynamically
    for item in parsed_items:
        if item['type'] == 'title_block':
            NumberedCanvas.chapter_header = item['chapter'].upper()
            sub = item['title']
            if len(sub) > 60:
                sub = sub[:57] + "..."
            NumberedCanvas.chapter_subheader = sub
            break
    # A4 dimensions: 595.27 x 841.89 points
    # Printable area: margins 54 (0.75 inch) -> width 487.27 pt
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=65,
        bottomMargin=65
    )

    styles = getSampleStyleSheet()

    # Define color scheme
    primary_color = colors.HexColor('#1E293B')   # Deep Slate Navy
    secondary_color = colors.HexColor('#475569') # Muted Slate
    accent_color = colors.HexColor('#2563EB')    # Vivid Indigo
    text_color = colors.HexColor('#0F172A')      # Clean Dark Text
    code_bg = colors.HexColor('#0F172A')         # Dark Navy Code Block
    diagram_bg = colors.HexColor('#F8FAFC')      # Slate 50

    # Typography definitions
    doc_title_style = ParagraphStyle(
        name='DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=25,
        textColor=primary_color,
        alignment=1,
        spaceAfter=15
    )

    doc_subtitle_style = ParagraphStyle(
        name='DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        alignment=1,
        spaceAfter=30
    )

    doc_chapter_style = ParagraphStyle(
        name='DocChapter',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=accent_color,
        alignment=1,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        name='CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.white,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        name='CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=primary_color,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=text_color,
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        name='CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=text_color,
        leftIndent=24,
        firstLineIndent=-14,
        spaceAfter=6
    )

    code_font_style = ParagraphStyle(
        name='CustomCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    diagram_font_style = ParagraphStyle(
        name='CustomDiagram',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor('#334155')
    )

    table_text_style = ParagraphStyle(
        name='TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=text_color
    )

    table_header_style = ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    # Process items
    for item in parsed_items:
        t = item['type']

        if t == 'title_block':
            # Create a premium cover page
            story.append(Spacer(1, 120))
            
            # Chapter
            story.append(Paragraph(text_to_html(item['chapter']), doc_chapter_style))
            story.append(Spacer(1, 10))
            
            # Main Title
            story.append(Paragraph(text_to_html(item['title']), doc_title_style))
            story.append(Spacer(1, 15))
            
            # Subtitle
            story.append(Paragraph(text_to_html(item['subtitle']), doc_subtitle_style))
            story.append(Spacer(1, 20))
            
            # Separator Line
            line_table = Table([['']], colWidths=[150], rowHeights=[2])
            line_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), accent_color),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ]))
            story.append(line_table)
            
            story.append(Spacer(1, 160))

        elif t == 'metadata':
            # Create metadata display box at the bottom of the cover page
            meta_data = []
            for key, val in item['data'].items():
                k_p = Paragraph(f"<b>{key} :</b>", body_style)
                v_p = Paragraph(text_to_html(val), body_style)
                meta_data.append([k_p, v_p])
            
            meta_table = Table(meta_data, colWidths=[120, 280])
            meta_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ]))
            story.append(meta_table)
            story.append(PageBreak()) # Jump to page 2 (Contents start here)

        elif t == 'h1':
            # Section Header (dark Navy block with white text)
            p = Paragraph(text_to_html(item['text']), h1_style)
            h1_table = Table([[p]], colWidths=[487])
            h1_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), primary_color),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ]))
            
            # Avoid orphans and add spacing
            story.append(Spacer(1, 15))
            story.append(KeepTogether([h1_table, Spacer(1, 8)]))

        elif t == 'h2':
            # Subsection Header (underlined with indigo/blue)
            p = Paragraph(text_to_html(item['text']), h2_style)
            h2_table = Table([[p]], colWidths=[487])
            h2_table.setStyle(TableStyle([
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('LINEBELOW', (0,0), (-1,-1), 1.2, colors.HexColor('#3B82F6')), # Accent line
            ]))
            
            story.append(Spacer(1, 10))
            story.append(KeepTogether([h2_table, Spacer(1, 6)]))

        elif t == 'paragraph':
            # Standard Paragraph
            story.append(Paragraph(text_to_html(item['text']), body_style))

        elif t == 'bullet':
            # Bullet point or numbered list item
            formatted_bullet = f"<font color='{accent_color.hexval()}'><b>{item['bullet_char']}</b></font>&nbsp;&nbsp;"
            story.append(Paragraph(formatted_bullet + text_to_html(item['text']), bullet_style))

        elif t == 'code':
            # Code block container
            clean_code = clean_plain_text(item['text'])
            pre = Preformatted(clean_code, code_font_style)
            code_table = Table([[pre]], colWidths=[487])
            code_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), code_bg),
                ('BOX', (0,0), (-1,-1), 0.5, primary_color),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ]))
            story.append(Spacer(1, 4))
            story.append(KeepTogether([code_table, Spacer(1, 6)]))

        elif t == 'diagram':
            # Diagram block container
            clean_diag = clean_plain_text(item['text'])
            pre = Preformatted(clean_diag, diagram_font_style)
            diag_table = Table([[pre]], colWidths=[487])
            diag_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), diagram_bg),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ]))
            story.append(Spacer(1, 4))
            story.append(KeepTogether([diag_table, Spacer(1, 6)]))

        elif t == 'table':
            # Dynamic styled ReportLab Table
            headers = [Paragraph(f"<b>{text_to_html(h)}</b>", table_header_style) for h in item['headers']]
            rows = []
            for r in item['rows']:
                rows.append([Paragraph(text_to_html(cell), table_text_style) for cell in r])
            
            # Calculate widths based on content lengths
            col_widths = calculate_col_widths(item['headers'], item['rows'])
            
            # Final data includes headers
            table_data = [headers] + rows
            
            r_table = Table(table_data, colWidths=col_widths)
            r_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), primary_color), # Navy header
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]), # Zebra striping
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ]))
            
            # Add table title if it exists
            table_elements = []
            if item.get('title'):
                title_p = Paragraph(f"<b>{text_to_html(item['title'])}</b>", h2_style)
                table_elements.append(title_p)
                table_elements.append(Spacer(1, 4))
            
            table_elements.append(r_table)
            
            story.append(Spacer(1, 6))
            story.append(KeepTogether([KeepTogether(table_elements), Spacer(1, 8)]))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)


def calculate_col_widths(headers, rows, total_width=487):
    """
    Helper function to dynamically calculate column widths proportional to the 
    max string lengths of cell values in each column.
    """
    n_cols = len(headers)
    max_lens = [len(str(h)) for h in headers]
    for row in rows:
        for col_idx, cell in enumerate(row):
            if col_idx < len(max_lens):
                max_lens[col_idx] = max(max_lens[col_idx], len(str(cell)))
                
    total_len = sum(max_lens)
    col_widths = []
    for l in max_lens:
        # Proportional width
        pct = l / total_len
        w = pct * total_width
        # Guarantee a minimum column width
        w = max(w, 40)
        col_widths.append(w)
        
    # Re-normalize to make sure sum is exactly total_width
    sum_w = sum(col_widths)
    col_widths = [w * (total_width / sum_w) for w in col_widths]
    return col_widths


if __name__ == '__main__':
    input_file = "e:\\sfm-PFE\\Meeting-IA-sfm\\chap1_rapport.txt"
    output_file = "e:\\sfm-PFE\\Meeting-IA-sfm\\chap1_rapport.pdf"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
        
    print(f"Reading from {input_file}...")
    parsed_items = parse_document(input_file)
    print(f"Parsed {len(parsed_items)} items. Generating PDF at {output_file}...")
    build_pdf(parsed_items, output_file)
    print("PDF generation completed successfully!")
