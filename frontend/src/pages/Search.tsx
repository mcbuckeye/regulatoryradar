import { useState, useEffect, FormEvent } from "react";
import {
  Search as SearchIcon,
  Loader2,
  BookmarkPlus,
  Trash2,
  Clock,
  Inbox,
} from "lucide-react";
import {
  search as searchApi,
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
} from "../api";
import type { RegulatoryUpdate, SavedSearch } from "../api";
import UpdateCard from "../components/UpdateCard";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegulatoryUpdate[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(true);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const searches = await getSavedSearches();
      setSavedSearches(searches);
    } catch {
      // Silently handle
    }
  };

  const performSearch = async (searchQuery: string, page = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await searchApi(searchQuery, page, 20);
      if (page === 1) {
        setResults(res.items);
      } else {
        setResults((prev) => [...prev, ...res.items]);
      }
      setTotalResults(res.total);
      setTotalPages(res.pages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    performSearch(query, 1);
  };

  const handleSavedSearchClick = (savedQuery: string) => {
    setQuery(savedQuery);
    performSearch(savedQuery, 1);
  };

  const handleSaveSearch = async () => {
    if (!query.trim() || saving) return;
    setSaving(true);
    try {
      await saveSearch(query.trim());
      await loadSavedSearches();
    } catch {
      // Silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = async (id: number) => {
    try {
      await deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Silently handle
    }
  };

  const handleLoadMore = () => {
    performSearch(query, currentPage + 1);
  };

  const hasMore = currentPage < totalPages;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Saved Searches Sidebar */}
      {savedSearches.length > 0 && (
        <aside className="lg:w-72 shrink-0 order-2 lg:order-1">
          <div className="card p-5 sticky top-24">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="flex items-center justify-between w-full mb-3"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Saved Searches
                </h3>
              </div>
              <span className="text-xs text-gray-400">
                {savedSearches.length}
              </span>
            </button>

            {showSaved && (
              <div className="space-y-1">
                {savedSearches.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center gap-2 group"
                  >
                    <button
                      onClick={() => handleSavedSearchClick(saved.query)}
                      className="flex-1 text-left text-sm text-gray-600 hover:text-primary-900 py-1.5 px-2 rounded-lg hover:bg-primary-50 transition-colors truncate"
                    >
                      {saved.query}
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(saved.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete saved search"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 order-1 lg:order-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Search Updates
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all regulatory updates..."
              className="w-full pl-12 pr-4 py-3.5 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-5 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>

        {/* Save Search Button */}
        {hasSearched && query.trim() && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {totalResults} result{totalResults !== 1 ? "s" : ""} for{" "}
              <span className="font-medium text-gray-700">"{query}"</span>
            </p>
            <button
              onClick={handleSaveSearch}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-900 font-medium transition-colors"
            >
              <BookmarkPlus className="w-4 h-4" />
              {saving ? "Saving..." : "Save this search"}
            </button>
          </div>
        )}

        {/* Results */}
        {!hasSearched ? (
          <div className="card p-12 text-center">
            <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Search regulatory updates
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Search across all FDA guidance, approvals, safety alerts, and
              clinical trial updates. Use specific terms for better results.
            </p>
          </div>
        ) : loading && results.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="flex gap-2 mb-3">
                  <div className="skeleton h-5 w-16" />
                  <div className="skeleton h-5 w-20" />
                </div>
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-4 w-full mb-1" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="card p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No results found
            </h3>
            <p className="text-gray-500 text-sm">
              Try different keywords or broaden your search terms.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {results.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
