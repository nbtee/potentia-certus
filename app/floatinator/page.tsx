"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/floatinator/supabase";

type SearchResult = {
  source_id: string;
  company_name: string;
  techs: string;
  total_mentions: number;
  last_updated_at: string;
  match_rank: number;
  account_category: string;
  region: string;
  company_size: string;
};

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerms, setActiveSearchTerms] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountCategory, setAccountCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [companySize, setCompanySize] = useState("all");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Re-run search when filters change
  useEffect(() => {
    if (activeSearchTerms.length > 0) {
      handleSearch(0, activeSearchTerms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountCategory, region, companySize]);

  const handleSearch = async (pageNum = 0, termsToSearch?: string[]) => {
    // Parse search terms from input or use provided terms
    let terms = termsToSearch;
    if (!terms) {
      if (!searchTerm.trim()) return;
      // Parse new search term (single term, no commas)
      const newTerm = searchTerm.trim();

      if (!newTerm) return;

      // Append to existing terms or create new array
      terms = [...activeSearchTerms, newTerm];
      setActiveSearchTerms(terms);

      // Clear the search input for next search
      setSearchTerm("");
    }

    setLoading(true);
    setPage(pageNum);

    // Call grouped multi-tech search function
    const { data, error } = await supabase.rpc("search_tech_multi_grouped", {
      search_terms: terms,
      min_mentions_filter: 0,
      sort_column: sortColumn,
      sort_direction: sortDirection,
      page_offset: pageNum * PAGE_SIZE,
      page_limit: PAGE_SIZE,
      account_category_filter: accountCategory === "all" ? null : accountCategory,
      region_filter: region === "all" ? null : region,
      company_size_filter: companySize === "all" ? null : companySize,
    });

    setLoading(false);

    if (error) {
      console.error("Search error:", error);
      return;
    }

    // Approximate count: if we got a full page, assume there might be more
    const approximateCount = data
      ? (data.length === PAGE_SIZE ? (pageNum + 2) * PAGE_SIZE : pageNum * PAGE_SIZE + data.length)
      : 0;

    setTotalCount(approximateCount);
    setResults(data || []);
  };

  const removeSearchTerm = (termToRemove: string) => {
    const newTerms = activeSearchTerms.filter(term => term !== termToRemove);
    setActiveSearchTerms(newTerms);

    if (newTerms.length === 0) {
      // If no terms left, clear results
      setResults([]);
      setTotalCount(0);
      setSearchTerm("");
    } else {
      // Re-search with remaining terms
      handleSearch(0, newTerms);
      setSearchTerm(newTerms.join(", "));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleColumnSort = (column: string) => {
    if (activeSearchTerms.length === 0) return;

    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }

    // Trigger search with new sort
    handleSearch(0, activeSearchTerms);
  };

  return (
    <div style={{ padding: "40px 0px", maxWidth: 1400, margin: "0 auto", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: "#0B141B", fontWeight: 600 }}>Floatinator</h1>
        <img src="/Potentia_logo_full.svg" alt="Potentia Logo" style={{ height: 40 }} />
      </div>

      {/* Search Bar and Filters */}
      <div style={{ marginBottom: 40, display: "flex", gap: 15, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search Bar */}
        <div style={{ display: "flex", gap: 10, minWidth: 400, flexGrow: 1, maxWidth: 600 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search technology or company (e.g. react)"
            aria-label="Search for technology or company"
            style={{
              flex: 1,
              padding: "12px 20px",
              fontSize: 16,
              border: "2px solid #999",
              borderRadius: 8,
              outline: "none",
              color: "#0B141B",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#00E5C0";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 229, 192, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#999";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={() => handleSearch(0)}
            disabled={loading}
            style={{
              padding: "12px 30px",
              fontSize: 16,
              backgroundColor: "#00E5C0",
              color: "#0B141B",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontWeight: 600,
              fontFamily: "var(--font-degular-display)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#00ccaa";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 229, 192, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#00E5C0";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Filters */}
        <div style={{ marginLeft: "auto" }}>
          <label htmlFor="account-category" style={{ fontSize: 14, fontWeight: 500, marginRight: 8, color: "#333" }}>
            Account Category:
          </label>
          <select
            id="account-category"
            value={accountCategory}
            onChange={(e) => setAccountCategory(e.target.value)}
            style={{
              padding: "6px 28px 6px 10px",
              fontSize: 14,
              border: "1px solid #999",
              borderRadius: 6,
              color: "#0B141B",
              minWidth: 120,
            }}
          >
            <option value="all">All</option>
            <option value="Consultancy">Consultancy</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Gov AoG">Gov AoG</option>
            <option value="Gov Non AoG">Gov Non AoG</option>
            <option value="MSP">MSP</option>
            <option value="Other">Other</option>
            <option value="Product">Product</option>
            <option value="SME">SME</option>
            <option value="Vendor">Vendor</option>
          </select>
        </div>

        <div>
          <label htmlFor="region" style={{ fontSize: 14, fontWeight: 500, marginRight: 8, color: "#333" }}>
            Region:
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              padding: "6px 28px 6px 10px",
              fontSize: 14,
              border: "1px solid #999",
              borderRadius: 6,
              color: "#0B141B",
              minWidth: 120,
            }}
          >
            <option value="all">All</option>
            <option value="Auckland">Auckland</option>
            <option value="Bay of Plenty">Bay of Plenty</option>
            <option value="Canterbury">Canterbury</option>
            <option value="Gisborne">Gisborne</option>
            <option value="Hawke's Bay">Hawke's Bay</option>
            <option value="Manawatu-Wanganui">Manawatu-Wanganui</option>
            <option value="Marlborough">Marlborough</option>
            <option value="Nelson">Nelson</option>
            <option value="Northland">Northland</option>
            <option value="Otago">Otago</option>
            <option value="Southland">Southland</option>
            <option value="Taranaki">Taranaki</option>
            <option value="Tasman">Tasman</option>
            <option value="Waikato">Waikato</option>
            <option value="Wellington">Wellington</option>
            <option value="West Coast">West Coast</option>
          </select>
        </div>

        <div>
          <label htmlFor="company-size" style={{ fontSize: 14, fontWeight: 500, marginRight: 8, color: "#333" }}>
            Company Size:
          </label>
          <select
            id="company-size"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            style={{
              padding: "6px 28px 6px 10px",
              fontSize: 14,
              border: "1px solid #999",
              borderRadius: 6,
              color: "#0B141B",
              minWidth: 120,
            }}
          >
            <option value="all">All</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="501-1000">501-1000</option>
            <option value="1001-5000">1001-5000</option>
            <option value="5001-10000">5001-10000</option>
            <option value="10001-50000">10001-50000</option>
          </select>
        </div>
      </div>

      {/* Active Search Terms Pills */}
      {activeSearchTerms.length > 0 && (
        <div style={{ marginBottom: 30, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {activeSearchTerms.map((term, index) => (
            <div
              key={index}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                backgroundColor: "#d4f9f2",
                border: "1px solid #00E5C0",
                borderRadius: 20,
                fontSize: 14,
                color: "#007a68",
                fontWeight: 500,
              }}
            >
              <span>{term}</span>
              <button
                onClick={() => removeSearchTerm(term)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007a68",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label={`Remove ${term}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      <div>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, backgroundColor: "#fff", border: "1px solid #999", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ backgroundColor: "#E3E5E8", borderBottom: "2px solid #999" }}>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("company_name")}
              >
                Company Name {sortColumn === "company_name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("source_id")}
              >
                Bullhorn ID {sortColumn === "source_id" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("techs")}
              >
                Technologies {sortColumn === "techs" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("total_mentions")}
              >
                Total Mentions {sortColumn === "total_mentions" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("region")}
              >
                Region {sortColumn === "region" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("company_size")}
              >
                Company Size {sortColumn === "company_size" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("account_category")}
              >
                Account Category {sortColumn === "account_category" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                onClick={() => handleColumnSort("last_updated_at")}
              >
                Last Updated {sortColumn === "last_updated_at" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => {
              const isHovered = hoveredRow === result.source_id;
              return (
              <tr
                key={result.source_id}
                onMouseEnter={() => setHoveredRow(result.source_id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  borderBottom: "1px solid #999",
                  backgroundColor: isHovered ? "#d4f9f2" : (index % 2 === 0 ? "#ffffff" : "#f5f5f5"),
                  transition: "background-color 0.2s ease"
                }}
              >
                <td style={tdStyle}>
                  {result.company_name}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    backgroundColor: copiedId === result.source_id ? "#b8f0e8" : "transparent",
                    cursor: "pointer",
                    color: copiedId === result.source_id ? "#007a68" : "#0B141B",
                    fontWeight: copiedId === result.source_id ? 600 : 400,
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => copyToClipboard(result.source_id)}
                  title="Click to copy ID"
                >
                  {copiedId === result.source_id ? "✓ Copied!" : result.source_id}
                </td>
                <td style={tdStyle}>
                  {result.techs}
                </td>
                <td style={tdStyle}>
                  {result.total_mentions}
                </td>
                <td style={tdStyle}>
                  {result.region || '-'}
                </td>
                <td style={tdStyle}>
                  {result.company_size || '-'}
                </td>
                <td style={tdStyle}>
                  {result.account_category || '-'}
                </td>
                <td style={tdStyle}>
                  {new Date(result.last_updated_at).toLocaleDateString()}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination at bottom */}
        {results.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 40,
              gap: 20,
            }}
          >
            <button
              onClick={() => handleSearch(page - 1, activeSearchTerms)}
              disabled={page === 0 || loading}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                backgroundColor: page === 0 ? "#d0d0d0" : "#00b89a",
                color: page === 0 ? "#666" : "white",
                border: "none",
                borderRadius: 6,
                cursor: page === 0 || loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (page !== 0 && !loading) {
                  e.currentTarget.style.backgroundColor = "#008f7a";
                }
              }}
              onMouseLeave={(e) => {
                if (page !== 0 && !loading) {
                  e.currentTarget.style.backgroundColor = "#00b89a";
                }
              }}
            >
              ← Previous
            </button>

            <p style={{ color: "#333", margin: 0, fontSize: 14 }}>
              Showing {page * PAGE_SIZE + 1}-
              {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} results
            </p>

            <button
              onClick={() => handleSearch(page + 1, activeSearchTerms)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount || loading}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                backgroundColor:
                  (page + 1) * PAGE_SIZE >= totalCount ? "#d0d0d0" : "#00b89a",
                color:
                  (page + 1) * PAGE_SIZE >= totalCount ? "#666" : "white",
                border: "none",
                borderRadius: 6,
                cursor:
                  (page + 1) * PAGE_SIZE >= totalCount || loading
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if ((page + 1) * PAGE_SIZE < totalCount && !loading) {
                  e.currentTarget.style.backgroundColor = "#008f7a";
                }
              }}
              onMouseLeave={(e) => {
                if ((page + 1) * PAGE_SIZE < totalCount && !loading) {
                  e.currentTarget.style.backgroundColor = "#00b89a";
                }
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {!loading && results.length === 0 && searchTerm && (
        <p style={{ color: "#333", textAlign: "center", marginTop: 40 }}>
          No results found for "{searchTerm}"
        </p>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  fontWeight: 600,
  color: "#0B141B",
};

const tdStyle = {
  padding: "12px",
  color: "#0B141B",
};
