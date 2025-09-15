const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function toNumberOrNull(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
}

(async () => {
    try {
        const cwd = process.cwd();
        const sourceCsv = path.join(cwd, 'categorie ovoko - mapowanie.csv');
        const outJson = path.join(cwd, 'categorie ovoko - mapowanie.json');

        const raw = fs.readFileSync(sourceCsv, 'utf8');
        const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length === 0) {
            console.error('CSV is empty.');
            process.exit(1);
        }

        const header = parseCsvLine(lines[0]);
        const expectedHeader = ['Source', 'Category ID', 'Name', 'OVOKO ID', 'OVOKO Name', 'Level'];
        if (header.length < expectedHeader.length) {
            console.warn('Warning: CSV header has fewer columns than expected:', header);
        }

        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            // Pad columns to expected length
            while (cols.length < expectedHeader.length) cols.push('');

            const source = cols[0] ? cols[0].trim() : '';
            const categoryId = toNumberOrNull(cols[1]);
            const name = cols[2] ? cols[2].trim() : '';
            const ovokoId = toNumberOrNull(cols[3]);
            const ovokoName = cols[4] ? cols[4].trim() : '';
            const level = toNumberOrNull(cols[5]);

            items.push({
                source,
                categoryId,
                name,
                ovokoId,
                ovokoName,
                level
            });
        }

        fs.writeFileSync(outJson, JSON.stringify(items, null, 2), 'utf8');
        console.log(`Written ${items.length} records to ${outJson}`);
    } catch (err) {
        console.error('Conversion failed:', err && err.message ? err.message : err);
        process.exit(1);
    }
})();





