export function toDbDate(date: Date, isSQLite: boolean): Date | number {
  if (isSQLite) {
    return date.getTime();
  }
  return date;
}

export function serializeForJson(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle numbers that look like timestamps (SQLite integer timestamps)
  if (typeof data === 'number' && data > 1000000000000 && data < 100000000000000) {
    return new Date(data).toISOString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(serializeForJson);
  }

  // Handle objects (but not special objects like Buffer, Date, etc.)
  if (typeof data === 'object' && data !== null) {
    // Skip binary data
    if (data instanceof Buffer || data instanceof ArrayBuffer || data instanceof Uint8Array) {
      return data;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      try {
        result[key] = serializeForJson(value);
      } catch {
        // If serialization fails, try JSON round-trip, fall back to string coercion
        try {
          result[key] = JSON.parse(JSON.stringify(value));
        } catch {
          result[key] = String(value);
        }
      }
    }
    return result;
  }

  return data;
}
