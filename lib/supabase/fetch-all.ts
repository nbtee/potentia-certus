/**
 * Paginated Supabase Query Helper
 *
 * Supabase PostgREST `.select()` returns at most 1,000 rows by default.
 * This utility paginates through all pages using `.range()`.
 *
 * Usage:
 *   const data = await fetchAllRows(
 *     supabase.from('activities').select('...').eq('col', val)
 *   );
 */

const PAGE_SIZE = 1000;

/**
 * Fetch all rows from a Supabase query, paginating past the 1,000-row limit.
 * The query builder is reusable — each `.range()` call updates headers and
 * each `await` fires a fresh HTTP request with the current state.
 */
export async function fetchAllRows(
  query: { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> }
): Promise<unknown[]> {
  const allRows: unknown[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}
