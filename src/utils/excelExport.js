import * as XLSX from 'xlsx';

/**
 * Utility to export table data to Excel (.xlsx)
 * @param {Object} options 
 * @param {string} options.title - Report title
 * @param {Array} options.data - The data array
 * @param {Array} options.columns - Column configuration (can include subColumns)
 * @param {string} options.filename - Output filename
 */
export const exportToExcel = ({ title, data, columns, filename, metadata }) => {
    // 1. Flatten columns to handle nested headers
    const flatColumns = columns.flatMap(col => col.subColumns || [col]);
    const numCols = flatColumns.length;
    const midIdx = Math.floor(numCols / 2);

    // 2. Prepare Header Branding (AOA)
    const displayTitle = title === 'Visitor Logs' ? 'VISITOR LOG' : 
                        title === 'Vehicle Logs' ? 'VEHICLE LOG' : 
                        title.toUpperCase();

    const aoa = [
        [displayTitle], // R1: Title (will merge)
        ['Nextgen Shield (Private) Limited', '', '', 'Lyceum International School (Private) Limited'], // R2: Names
        ['10 Raymond Rd, 9th Floor, Nugegoda', '', '', '8/3A, Arthur V. Dias Mawatha, Walana, Panadura'], // R3: Address 1
        ['Contact: 077 771 3900', '', '', 'Contact: 0384 548 585'], // R4: Contact
        ['', '', '', '0384 548 585'], // R5: Extra Lyceum contact/address (optional)
        ['Time Period:', metadata?.period || 'Live Feed', '', 'Report Date:', new Date().toLocaleDateString('en-GB')], // R6: Metadata
        [], // R7: Spacer
        flatColumns.map(c => c.header) // R8: Table Headers
    ];

    // 3. Add Data Rows
    data.forEach(item => {
        const row = flatColumns.map(col => {
            let val = item[col.key];
            if (col.render) {
                try {
                    const rendered = col.render(val, item);
                    if (rendered && typeof rendered === 'object') {
                        val = val != null ? String(val) : '-';
                    } else {
                        val = rendered;
                    }
                } catch (e) {
                    // Keep raw value
                }
            }
            return (val == null || val === '') ? '-' : val;
        });
        aoa.push(row);
    });

    // 4. Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // 5. Apply Merges (for Title and Branding)
    worksheet['!merges'] = [
        { s: {r:0, c:0}, e: {r:0, c:numCols - 1} }, // Title centered across all columns
    ];

    // 6. Calculate Column Widths (Auto-fit)
    const colWidths = flatColumns.map((col, i) => {
        const headerLen = col.header.length;
        const maxContentLen = data.reduce((max, item) => {
            const rawVal = item[col.key];
            const val = typeof rawVal === 'string' ? rawVal : String(rawVal || '');
            return Math.max(max, val.length);
        }, headerLen);
        return { wch: maxContentLen + 4 }; // Add padding
    });
    worksheet['!cols'] = colWidths;

    // 7. Create workbook and download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};
