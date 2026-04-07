import jsPDF from 'jspdf';

/**
 * PDFExportService — Generates branded PDF reports using the Builder pattern.
 * 
 * Design Pattern: Builder — Chainable configuration before final export.
 * 
 * Usage:
 *   await new PDFExportService('Visitor Report')
 *     .withMetadata({ generatedBy: 'Admin', range: '2026-03' })
 *     .addTable(columns, rows)
 *     .export('visitor_report.pdf');
 */

// ─── Color Palette (Design System Constants) ─────────────────────────────────
const COLORS = {
    headerBg: [15, 23, 42],
    primary: [255, 140, 0],
    darkHeader: [30, 41, 59],
    white: [255, 255, 255],
    bodyText: [30, 41, 59],
    mutedText: [100, 116, 139],
    rowAlt: [248, 250, 252],
    border: [226, 232, 240],
    successGreen: [16, 185, 129],
    warningAmber: [245, 158, 11],
    dangerRed: [239, 68, 68],
};

/** Helper: set fill color */
const setFill = (doc, c) => doc.setFillColor(...c);
/** Helper: set text color */
const setText = (doc, c) => doc.setTextColor(...c);
/** Helper: set draw color */
const setDraw = (doc, c) => doc.setDrawColor(...c);

/** Truncate string to max length */
const truncate = (str, max = 35) => {
    const s = str != null ? String(str) : '-';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
};

// ─── PDFExportService Class ──────────────────────────────────────────────────

export class PDFExportService {
    /**
     * @param {string} title — Report title displayed in the header
     */
    constructor(title) {
        this.title = title;
        this.metadata = {};
        this.tables = [];
        this.logoBase64 = null;
        this.orientation = 'p'; // default portrait
    }

    /**
     * Set PDF page orientation ('p' for portrait, 'l' for landscape).
     * @param {string} orientation
     * @returns {PDFExportService} this
     */
    withOrientation(orientation) {
        this.orientation = orientation;
        return this;
    }

    /**
     * Set report metadata (generatedBy, range, etc.).
     * @param {Object} metadata
     * @returns {PDFExportService} this (Builder pattern)
     */
    withMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }

    /**
     * Pre-load and attach the company logo.
     * @returns {PDFExportService} this
     */
    async withLogo() {
        this.logoBase64 = await PDFExportService._loadLogoBase64();
        return this;
    }

    /**
     * Add a data table to the report.
     * @param {Array<{ header: string, key: string, render?: Function }>} columns
     * @param {Array<Object>} data — Raw data rows
     * @returns {PDFExportService} this
     */
    addTable(columns, data, sectionTitle = 'Detailed Records') {
        this.tables.push({ columns, data, sectionTitle });
        return this;
    }

    /**
     * Generate and save the PDF.
     * @param {string} filename
     * @returns {Promise<void>}
     */
    async export(filename) {
        // Auto-load logo if not already loaded
        if (!this.logoBase64) {
            await this.withLogo();
        }

        const doc = new jsPDF(this.orientation, 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. Header
        let y = this._drawHeader(doc, pageWidth) + 8;

        // 2. Info table
        y = this._drawInfoTable(doc, y, pageWidth);

        // 3. Data tables
        for (const table of this.tables) {
            setText(doc, COLORS.bodyText);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(table.sectionTitle || 'Detailed Records', 14, y + 4);
            y += 8;

            const rows = this._flattenTableRows(table.columns, table.data);
            y = this._drawTable(doc, table.columns, rows, y, pageWidth);
            y += 6;
        }

        // 4. Footer on every page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            this._drawFooter(doc, pageWidth, pageHeight, i, pageCount);
        }

        const outputName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        doc.save(outputName);
    }

    // ─── Private Drawing Methods ─────────────────────────────────────────────

    _drawHeader(doc, pageWidth) {
        const H = 75; // Balanced height for title + dual branding

        setFill(doc, COLORS.headerBg);
        doc.rect(0, 0, pageWidth, H, 'F');

        setFill(doc, COLORS.primary);
        doc.rect(0, 0, 4, H, 'F');

        const textMargin = 12;

        // --- 1. Centered Title (Top Middle) ---
        setText(doc, COLORS.white);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const displayTitle = this.title === 'Visitor Logs' ? 'VISITOR LOG' : 
                            this.title === 'Vehicle Logs' ? 'VEHICLE LOG' : 
                            this.title.toUpperCase();
        doc.text(displayTitle, pageWidth / 2, 12, { align: 'center' });

        // --- 2. Left Side: Nextgen Shield (Below Title) ---
        setText(doc, COLORS.primary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Nextgen Shield (Private) Limited', textMargin, 26);

        setText(doc, COLORS.white);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('10 Raymond Rd, 9th Floor, Nugegoda', textMargin, 31);
        doc.text('Contact: 077 771 3900', textMargin, 36);

        // --- 3. Right Side: Lyceum (Below Title) ---
        setText(doc, COLORS.primary);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Lyceum International School (Private) Limited', pageWidth - textMargin, 26, { align: 'right' });

        setText(doc, COLORS.white);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('8/3A, Arthur V. Dias Mawatha, Walana, Panadura', pageWidth - textMargin, 31, { align: 'right' });
        doc.text('12500, Sri Lanka', pageWidth - textMargin, 36, { align: 'right' });
        doc.text('Contact: 0384 548 585', pageWidth - textMargin, 41, { align: 'right' });

        setDraw(doc, COLORS.primary);
        doc.setLineWidth(0.8);
        doc.line(0, H, pageWidth, H);

        return H;
    }

    _drawInfoTable(doc, startY, pageWidth) {
        const margin = 14;
        const tableW = pageWidth - margin * 2;
        const colW = tableW / 4;
        const hH = 8, vH = 9;

        setText(doc, COLORS.bodyText);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Report Information', margin, startY + 5);

        const tY = startY + 8;

        setFill(doc, COLORS.primary);
        doc.rect(margin, tY, tableW, hH, 'F');
        setText(doc, COLORS.headerBg);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        ['Generated By', 'Report Status', 'Report Date', 'Time Period'].forEach((h, i) => {
            doc.text(h, margin + i * colW + 3, tY + 5.5);
        });

        setFill(doc, COLORS.white);
        setDraw(doc, COLORS.border);
        doc.setLineWidth(0.3);
        doc.rect(margin, tY + hH, tableW, vH, 'FD');
        setText(doc, COLORS.bodyText);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        [
            this.metadata.generatedBy || 'Security Operations',
            'Finalized',
            new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            this.metadata.period || this.metadata.range || 'Live Feed',
        ].forEach((v, i) => {
            doc.text(String(v), margin + i * colW + 3, tY + hH + 6);
        });

        return tY + hH + vH + 8;
    }

    _drawTable(doc, columns, rows, startY, pageWidth) {
        const margin = 14;
        const tableW = pageWidth - margin * 2;
        const flatColumns = columns.flatMap(c => c.subColumns || [c]);
        const colW = tableW / flatColumns.length;
        const hasGroups = columns.some(c => c.subColumns);
        const rowH = 8;
        const headerH = hasGroups ? 14 : 9;
        let y = startY;

        const drawRowHeader = () => {
            setFill(doc, COLORS.darkHeader);
            doc.rect(margin, y, tableW, headerH, 'F');
            setText(doc, COLORS.white);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.1);

            if (hasGroups) {
                let currentX = margin;
                
                columns.forEach((col) => {
                    const span = col.subColumns ? col.subColumns.length : 1;
                    const w = colW * span;
                    const textY = col.subColumns ? y + 5.5 : y + 9;
                    
                    let headText = col.header.toUpperCase();
                    if (headText === 'EMPLOYEE CODE/ID') headText = 'EMP. CODE/ID';
                    if (doc.getTextWidth(headText) > w - 2) {
                        headText = doc.splitTextToSize(headText, w - 2)[0] || headText;
                    }
                    doc.text(headText, currentX + w / 2, textY, { align: 'center' });
                    
                    // Vertical dividers for the column block
                    doc.line(currentX, y, currentX, y + headerH);
                    doc.line(currentX + w, y, currentX + w, y + headerH);
                    
                    if (col.subColumns) {
                        // Horizontal divider for grouped block
                        doc.line(currentX, y + 7.5, currentX + w, y + 7.5);
                        
                        let subX = currentX;
                        col.subColumns.forEach(sub => {
                            // Vertical dividers for inner sub-columns
                            if (subX > currentX) {
                                doc.line(subX, y + 7.5, subX, y + headerH);
                            }
                            let subText = sub.header.toUpperCase();
                            if (doc.getTextWidth(subText) > colW - 2) {
                                subText = doc.splitTextToSize(subText, colW - 2)[0] || subText;
                            }
                            doc.text(subText, subX + colW / 2, y + 11.5, { align: 'center' });
                            subX += colW;
                        });
                    }
                    currentX += w;
                });
            } else {
                columns.forEach((col, i) => {
                    const currentX = margin + i * colW;
                    let headText = col.header.toUpperCase();
                    if (headText === 'EMPLOYEE CODE/ID') headText = 'EMP. CODE/ID';
                    if (doc.getTextWidth(headText) > colW - 2) {
                        headText = doc.splitTextToSize(headText, colW - 2)[0] || headText;
                    }
                    doc.text(headText, currentX + colW / 2, y + 6, { align: 'center' });
                    doc.line(currentX, y, currentX, y + headerH);
                });
                doc.line(margin + tableW, y, margin + tableW, y + headerH);
            }
            y += headerH;
        };

        const checkPageBreak = () => {
            const pageH = doc.internal.pageSize.getHeight();
            if (y + rowH > pageH - 20) {
                doc.addPage();
                y = 20;
                drawRowHeader();
            }
        };

        drawRowHeader();

        rows.forEach((row, rowIdx) => {
            checkPageBreak();

            if (rowIdx % 2 === 1) {
                setFill(doc, COLORS.rowAlt);
                doc.rect(margin, y, tableW, rowH, 'F');
            }

            setDraw(doc, COLORS.border);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, tableW, rowH, 'D');

            row.forEach((cell, i) => {
                const cellText = String(cell ?? '-');
                const lower = cellText.toLowerCase();

                if (['checked-in', 'approved', 'confirmed', 'complete', 'scheduled'].some(s => lower.includes(s))) {
                    setText(doc, COLORS.successGreen);
                    doc.setFont('helvetica', 'bold');
                } else if (['pending', 'in progress', 'meeting requested'].some(s => lower.includes(s))) {
                    setText(doc, COLORS.warningAmber);
                    doc.setFont('helvetica', 'bold');
                } else if (['denied', 'rejected', 'cancelled'].some(s => lower.includes(s))) {
                    setText(doc, COLORS.dangerRed);
                    doc.setFont('helvetica', 'bold');
                } else if (i === 0) {
                    setText(doc, COLORS.bodyText);
                    doc.setFont('helvetica', 'bold');
                } else {
                    setText(doc, COLORS.bodyText);
                    doc.setFont('helvetica', 'normal');
                }

                doc.setFontSize(7);
                const clipped = doc.splitTextToSize(cellText, colW - 4)[0] || cellText;
                doc.text(clipped, margin + i * colW + 3, y + 5.5);
            });

            y += rowH;
        });

        return y;
    }

    _drawFooter(doc, pageWidth, pageHeight, pageNum, pageCount) {
        const y = pageHeight - 12;
        setDraw(doc, COLORS.border);
        doc.setLineWidth(0.3);
        doc.line(14, y - 3, pageWidth - 14, y - 3);

        setText(doc, COLORS.mutedText);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Nextgen Shield (Private) Limited  •  Confidential', 14, y + 1);
        doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - 14, y + 1, { align: 'right' });
    }

    _flattenTableRows(columns, data) {
        const flatColumns = columns.flatMap(c => c.subColumns || [c]);
        return data.map(row =>
            flatColumns.map(col => {
                let val = row[col.key];
                if (col.render) {
                    try {
                        const rendered = col.render(val, row);
                        if (rendered !== null && typeof rendered === 'object' && rendered.$$typeof) {
                            val = val != null ? String(val) : '-';
                        } else {
                            val = rendered;
                    }  } catch /* eslint-disable-line no-unused-vars */ (___unused) { /* keep raw val */ }
                }
                return truncate(val);
            })
        );
    }

    // ─── Static Helpers ──────────────────────────────────────────────────────

    static _loadLogoBase64() {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = '/logo.png';
        });
    }
}

// ─── Legacy API (backward-compatible) ────────────────────────────────────────

/**
 * @deprecated Use `new PDFExportService(title).addTable(columns, data).export(filename)` instead.
 */
export const exportToPDF = async (options) => {
    const { title, data, columns, filename, metadata = {}, orientation = 'p' } = options;

    await new PDFExportService(title)
        .withOrientation(orientation)
        .withMetadata(metadata)
        .addTable(columns, data)
        .export(filename);
};
