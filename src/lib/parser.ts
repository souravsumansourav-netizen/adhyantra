import * as XLSX from 'xlsx';

export interface DailyParsedRow {
  metric_date: string; // YYYY-MM-DD
  total_users: number;
  sessions: number;
  bounce_rate: number; // 0 to 1
  avg_session_duration: number; // in seconds
  new_users: number;
  organic_bounce_rate?: number;
}

export interface ParsedGA4Data {
  detectedDate?: string; // YYYY-MM-DD
  isMultiDay: boolean;
  startDate?: string;
  endDate?: string;
  total_users: number;
  sessions: number;
  bounce_rate: number; // 0 to 1
  avg_session_duration: number; // in seconds
  new_users: number;
  organic_bounce_rate?: number; // 0 to 1 if present
  headersFound: string[];
  grandTotalRow: any[];
  dailyRows?: DailyParsedRow[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedGA4Data;
  error?: string;
  rawCommentLines: string[];
}

/**
 * Parses raw text or buffer from GA4 .csv or .xlsx export.
 */
export function parseGA4File(
  fileContent: string | ArrayBuffer | Uint8Array,
  fileName: string
): ParseResult {
  try {
    let rows: any[][] = [];

    const isCsv = fileName.toLowerCase().endsWith('.csv');

    if (isCsv && typeof fileContent === 'string') {
      // Parse CSV lines
      rows = parseCSVLines(fileContent);
    } else {
      // Parse XLSX or binary CSV with SheetJS
      const workbook = XLSX.read(fileContent, { type: typeof fileContent === 'string' ? 'string' : 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { success: false, error: 'The uploaded spreadsheet does not contain any sheets.', rawCommentLines: [] };
      }
      const sheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'The uploaded file is empty.', rawCommentLines: [] };
    }

    // 1. Extract '#' comment lines
    const commentLines: string[] = [];
    let headerRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = String(row[0] ?? '').trim();

      if (firstCell.startsWith('#')) {
        commentLines.push(row.map(c => String(c).trim()).filter(Boolean).join(' '));
        continue;
      }

      // Check if this row is the header line
      const normalizedRow = row.map(c => String(c).trim().toLowerCase());
      if (
        normalizedRow.some(c => c.includes('total users') || c.includes('total user')) &&
        normalizedRow.some(c => c.includes('session'))
      ) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        success: false,
        error: 'Could not find GA4 header row containing "Total users" and "Sessions". Please verify GA4 export format.',
        rawCommentLines: commentLines,
      };
    }

    // 2. Extract Date from '#' comment lines
    let detectedDate: string | undefined;
    let isMultiDay = false;
    let startDate: string | undefined;
    let endDate: string | undefined;

    for (const comment of commentLines) {
      // Look for format YYYYMMDD-YYYYMMDD (e.g. 20261010-20261010)
      const rangeMatch = comment.match(/(\d{4})(\d{2})(\d{2})\s*[-–to]+\s*(\d{4})(\d{2})(\d{2})/);
      if (rangeMatch) {
        const sYear = rangeMatch[1];
        const sMonth = rangeMatch[2];
        const sDay = rangeMatch[3];
        const eYear = rangeMatch[4];
        const eMonth = rangeMatch[5];
        const eDay = rangeMatch[6];

        startDate = `${sYear}-${sMonth}-${sDay}`;
        endDate = `${eYear}-${eMonth}-${eDay}`;

        if (startDate === endDate) {
          detectedDate = startDate;
          isMultiDay = false;
        } else {
          detectedDate = startDate; // default to start date
          isMultiDay = true;
        }
        break;
      }

      // Look for standard ISO date YYYY-MM-DD
      const isoMatch = comment.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        detectedDate = isoMatch[0];
        startDate = detectedDate;
        endDate = detectedDate;
        isMultiDay = false;
        break;
      }
    }

    // 3. Process Header Columns
    const headerRow = rows[headerRowIndex].map(c => String(c).trim());
    const colMap: Record<string, number> = {};

    headerRow.forEach((colName, index) => {
      const lower = colName.toLowerCase();
      if (lower === 'date' || lower === 'day' || lower.includes('metric_date') || lower.includes('session date')) {
        colMap['date'] = index;
      } else if (lower.includes('total user')) {
        colMap['total_users'] = index;
      } else if (lower === 'sessions' || lower.includes('session') && !lower.includes('duration')) {
        colMap['sessions'] = index;
      } else if (lower.includes('organic bounce rate')) {
        colMap['organic_bounce_rate'] = index;
      } else if (lower.includes('bounce rate')) {
        colMap['bounce_rate'] = index;
      } else if (lower.includes('duration')) {
        colMap['avg_session_duration'] = index;
      } else if (lower.includes('new user')) {
        colMap['new_users'] = index;
      }
    });

    if (
      colMap['total_users'] === undefined ||
      colMap['sessions'] === undefined ||
      colMap['bounce_rate'] === undefined
    ) {
      return {
        success: false,
        error: `Missing required GA4 columns. Found columns: ${headerRow.join(', ')}`,
        rawCommentLines: commentLines,
      };
    }

    // Normalization helper functions
    const parseNum = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const parseRate = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') {
        return val > 1 ? val / 100 : val;
      }
      const str = String(val).trim();
      const isPercent = str.includes('%');
      const num = parseNum(str);
      if (isPercent || num > 1) {
        return num / 100;
      }
      return num;
    };

    const parseDuration = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const str = String(val).trim();
      if (str.includes(':')) {
        const parts = str.split(':').map(p => parseFloat(p) || 0);
        if (parts.length === 2) {
          return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }
      return parseNum(str);
    };

    const parseRowDate = (raw: any): string | null => {
      if (raw === null || raw === undefined) return null;
      const str = String(raw).trim();
      if (/^\d{8}$/.test(str)) {
        return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        return str.replace(/\//g, '-');
      }
      return null;
    };

    // 4. Find Grand Total Row and any individual Daily Rows
    let grandTotalRow: any[] | undefined;
    const dailyRows: DailyParsedRow[] = [];

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const candidateRow = rows[i];
      if (!candidateRow || candidateRow.length === 0) continue;
      
      const rowStrings = candidateRow.map(c => String(c).trim().toLowerCase());
      const hasGrandTotalCell = rowStrings.some(c => c.includes('grand total'));

      if (hasGrandTotalCell) {
        grandTotalRow = candidateRow;
        continue;
      }

      // Check if this row is a daily record with a valid Date
      if (colMap['date'] !== undefined) {
        const rowDate = parseRowDate(candidateRow[colMap['date']]);
        if (rowDate) {
          dailyRows.push({
            metric_date: rowDate,
            total_users: Math.round(parseNum(candidateRow[colMap['total_users']])),
            sessions: Math.round(parseNum(candidateRow[colMap['sessions']])),
            bounce_rate: parseRate(candidateRow[colMap['bounce_rate']]),
            avg_session_duration: parseDuration(candidateRow[colMap['avg_session_duration'] ?? -1]),
            new_users: Math.round(parseNum(candidateRow[colMap['new_users'] ?? -1])),
            organic_bounce_rate: colMap['organic_bounce_rate'] !== undefined ? parseRate(candidateRow[colMap['organic_bounce_rate']]) : undefined,
          });
          continue;
        }
      }

      // If no row has explicit "grand total" text, fallback candidate
      if (!grandTotalRow && candidateRow.some(c => !isNaN(parseFloat(String(c))))) {
        grandTotalRow = candidateRow;
      }
    }

    if (!grandTotalRow && dailyRows.length === 0) {
      return {
        success: false,
        error: 'No data rows found below the header row.',
        rawCommentLines: commentLines,
      };
    }

    // If file has individual daily breakdown rows
    if (dailyRows.length > 0) {
      dailyRows.sort((a, b) => a.metric_date.localeCompare(b.metric_date));
      isMultiDay = dailyRows.length > 1;
      startDate = dailyRows[0].metric_date;
      endDate = dailyRows[dailyRows.length - 1].metric_date;
      detectedDate = startDate;
    }

    // If grand total row is missing but we have daily rows, aggregate them
    let total_users = 0;
    let sessions = 0;
    let bounce_rate = 0;
    let avg_session_duration = 0;
    let new_users = 0;
    let organic_bounce_rate: number | undefined;

    if (grandTotalRow) {
      total_users = Math.round(parseNum(grandTotalRow[colMap['total_users']]));
      sessions = Math.round(parseNum(grandTotalRow[colMap['sessions']]));
      bounce_rate = parseRate(grandTotalRow[colMap['bounce_rate']]);
      avg_session_duration = parseDuration(grandTotalRow[colMap['avg_session_duration'] ?? -1]);
      new_users = Math.round(parseNum(grandTotalRow[colMap['new_users'] ?? -1]));
      if (colMap['organic_bounce_rate'] !== undefined) {
        organic_bounce_rate = parseRate(grandTotalRow[colMap['organic_bounce_rate']]);
      }
    } else if (dailyRows.length > 0) {
      total_users = dailyRows.reduce((acc, r) => acc + r.total_users, 0);
      sessions = dailyRows.reduce((acc, r) => acc + r.sessions, 0);
      new_users = dailyRows.reduce((acc, r) => acc + r.new_users, 0);
      bounce_rate = dailyRows.reduce((acc, r) => acc + r.bounce_rate, 0) / dailyRows.length;
      avg_session_duration = dailyRows.reduce((acc, r) => acc + r.avg_session_duration, 0) / dailyRows.length;
    }

    return {
      success: true,
      data: {
        detectedDate,
        isMultiDay,
        startDate,
        endDate,
        total_users,
        sessions,
        bounce_rate,
        avg_session_duration,
        new_users,
        organic_bounce_rate,
        headersFound: headerRow,
        grandTotalRow: grandTotalRow || [],
        dailyRows: dailyRows.length > 0 ? dailyRows : undefined,
      },
      rawCommentLines: commentLines,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error parsing file: ${err?.message || 'Unknown error'}`,
      rawCommentLines: [],
    };
  }
}

/**
 * Helper to parse CSV string into array of rows respecting quotes and commas.
 */
function parseCSVLines(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse CSV line handling quoted cells
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }

  return rows;
}
