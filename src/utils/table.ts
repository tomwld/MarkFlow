export interface TableRow {
  cells: string[];
}

export interface Table {
  rows: TableRow[];
  separatorLineIndex: number;
}

export function isTableLine(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

export function parseTable(lines: string[], currentLineIndex: number): { table: Table, startLine: number, endLine: number } | null {
  if (currentLineIndex < 0 || currentLineIndex >= lines.length) return null;
  if (!isTableLine(lines[currentLineIndex])) {
    return null;
  }

  // Find start
  let startLine = currentLineIndex;
  while (startLine > 0 && isTableLine(lines[startLine - 1])) {
    startLine--;
  }

  // Find end
  let endLine = currentLineIndex;
  while (endLine < lines.length - 1 && isTableLine(lines[endLine + 1])) {
    endLine++;
  }

  const tableLines = lines.slice(startLine, endLine + 1);
  const rows: TableRow[] = tableLines.map(line => {
    const content = line.trim();
    // Remove first and last |
    const inner = content.substring(1, content.length - 1);
    // This simple split doesn't handle escaped pipes \| inside cells
    // For a robust implementation, a regex or char loop is needed.
    // Assuming simple tables for now.
    const cells = inner.split('|').map(c => c.trim());
    return { cells };
  });

  // Normalize rows to have same number of cells
  if (rows.length > 0) {
    const maxCells = Math.max(...rows.map(r => r.cells.length));
    rows.forEach(row => {
      while (row.cells.length < maxCells) {
        row.cells.push('');
      }
    });
  }

  // Find separator line
  let separatorLineIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Separator line usually contains dashes and optional colons
    if (row.cells.every(cell => /^[\s\-:]+$/.test(cell)) && row.cells.some(cell => cell.includes('-'))) {
      separatorLineIndex = i;
      break;
    }
  }

  return {
    table: { rows, separatorLineIndex },
    startLine,
    endLine
  };
}

// Calculate which column the cursor is in based on character position in line
export function getColumnIndex(line: string, ch: number): number {
  const content = line.trim();
  const lineStart = line.indexOf(content);
  
  if (ch < lineStart) return -1;
  
  // Relative position inside the trimmed content
  // But we need to account for the first pipe
  const prefix = line.substring(0, ch);
  // Count pipes
  const pipeCount = (prefix.match(/\|/g) || []).length;
  
  // If line starts with pipe, then 1 pipe means we are in first cell (index 0)
  // | cell |
  // ^ pipe 1 -> index 0
  return Math.max(0, pipeCount - 1);
}

export function formatTable(table: Table): string {
  if (table.rows.length === 0) return '';
  
  const colCount = table.rows[0].cells.length;
  const colWidths = new Array(colCount).fill(0);

  // Calculate widths (naive character count, considering CJK as 2 chars would be better but keeping simple for now)
  // A simple heuristic for CJK: string length + (match(/[^\x00-\xff]/g) || []).length
  const getWidth = (s: string) => {
    let len = 0;
    for (let i = 0; i < s.length; i++) {
      len += s.charCodeAt(i) > 255 ? 2 : 1;
    }
    return len;
  };

  table.rows.forEach(row => {
    row.cells.forEach((cell, i) => {
      if (i < colCount) {
        colWidths[i] = Math.max(colWidths[i], getWidth(cell));
      }
    });
  });

  // Ensure separator line has at least 3 dashes
  if (table.separatorLineIndex !== -1) {
    const sepRow = table.rows[table.separatorLineIndex];
    sepRow.cells.forEach((cell, i) => {
       if (i < colCount) {
         colWidths[i] = Math.max(colWidths[i], 3);
       }
    });
  } else {
    // If no separator found but it's a table, maybe add one?
    // For now, just respect existing structure
  }

  return table.rows.map((row, rowIndex) => {
    const cells = row.cells.map((cell, i) => {
      if (i >= colCount) return '';
      const width = colWidths[i];
      const cellWidth = getWidth(cell);
      const padding = width - cellWidth;
      
      // If it's separator line, we fill with dashes
      if (rowIndex === table.separatorLineIndex) {
        // preserve alignment chars if present (not implemented here, defaulting to dashes)
        // simple approach: just fill with dashes
        return '-'.repeat(width);
      }
      
      return cell + ' '.repeat(padding);
    });
    return `| ${cells.join(' | ')} |`;
  }).join('\n');
}

export function addRow(table: Table, index: number): Table {
  const colCount = table.rows[0].cells.length;
  const newRow: TableRow = { cells: new Array(colCount).fill('') };
  const newRows = [...table.rows];
  // index is where we want to insert.
  // If index is after separator, fine.
  newRows.splice(index, 0, newRow);
  
  // Adjust separator index if we inserted before it
  let newSepIndex = table.separatorLineIndex;
  if (index <= table.separatorLineIndex) {
    newSepIndex++;
  }
  
  return { ...table, rows: newRows, separatorLineIndex: newSepIndex };
}

export function deleteRow(table: Table, index: number): Table {
  if (index < 0 || index >= table.rows.length) return table;
  // Don't delete separator line
  if (index === table.separatorLineIndex) return table;
  
  const newRows = [...table.rows];
  newRows.splice(index, 1);
  
  let newSepIndex = table.separatorLineIndex;
  if (index < table.separatorLineIndex) {
    newSepIndex--;
  }
  
  return { ...table, rows: newRows, separatorLineIndex: newSepIndex };
}

export function addColumn(table: Table, index: number): Table {
  const newRows = table.rows.map((row, i) => {
    const newCells = [...row.cells];
    const content = i === table.separatorLineIndex ? '---' : '';
    // Insert at index
    // if index is -1 (start), 0 (after first col)...
    // Let's assume index is the column index to insert AFTER.
    // If index is -1, insert at beginning.
    // But table usually starts with pipe.
    // Let's say index 0 is first column.
    // We insert AT index (shifting current index to right).
    newCells.splice(index, 0, content);
    return { cells: newCells };
  });
  return { ...table, rows: newRows };
}

export function deleteColumn(table: Table, index: number): Table {
  if (table.rows.length === 0) return table;
  if (index < 0 || index >= table.rows[0].cells.length) return table;
  
  const newRows = table.rows.map(row => {
    const newCells = [...row.cells];
    newCells.splice(index, 1);
    return { cells: newCells };
  });
  return { ...table, rows: newRows };
}