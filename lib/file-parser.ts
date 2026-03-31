import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync'

export interface ParsedFileData {
  headers: string[]
  rows: Record<string, string>[]
  preview: Record<string, string>[] // First 5 rows
  totalRows: number
}

export async function parseCSV(buffer: Buffer): Promise<ParsedFileData> {
  try {
    const csvString = buffer.toString('utf-8')

    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    })

    if (!records || records.length === 0) {
      throw new Error('CSV file is empty or invalid')
    }

    const headers = Object.keys(records[0])
    const rows = records.map((record: any) => {
      const row: Record<string, string> = {}
      headers.forEach(header => {
        row[header] = String(record[header] || '')
      })
      return row
    })

    return {
      headers,
      rows,
      preview: rows.slice(0, 5),
      totalRows: rows.length,
    }
  } catch (error) {
    console.error('CSV parsing error:', error)
    throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function parseExcel(buffer: Buffer): Promise<ParsedFileData> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Use the first sheet
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('Excel file has no sheets')
    }

    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Get array of arrays first
      defval: '',
      blankrows: false,
    }) as any[][]

    if (!jsonData || jsonData.length < 2) {
      throw new Error('Excel file must have at least a header row and one data row')
    }

    // First row is headers
    const headers = jsonData[0].map(h => String(h || '').trim()).filter(Boolean)

    if (headers.length === 0) {
      throw new Error('Excel file has no valid headers')
    }

    // Convert remaining rows to objects
    const rows = jsonData.slice(1).map(row => {
      const rowObj: Record<string, string> = {}
      headers.forEach((header, index) => {
        rowObj[header] = String(row[index] || '').trim()
      })
      return rowObj
    }).filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(val => val !== '')
    })

    return {
      headers,
      rows,
      preview: rows.slice(0, 5),
      totalRows: rows.length,
    }
  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedFileData> {
  const extension = filename.toLowerCase().split('.').pop()

  switch (extension) {
    case 'csv':
      return parseCSV(buffer)
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer)
    default:
      throw new Error(`Unsupported file type: ${extension}. Please upload a CSV or Excel file.`)
  }
}

export function validateFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  return size <= MAX_SIZE
}

export function validateFileType(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop()
  return ['csv', 'xlsx', 'xls'].includes(extension || '')
}
