import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ArrowUpDown, Loader2, Inbox } from "lucide-react";
import { getUpdates } from "../api";
import type { RegulatoryUpdate, UpdateFilters } from "../api";
import UpdateCard from "../components/UpdateCard";
import FilterSidebar from "../components/FilterSidebar";

export default function Feed() {
  const [searchParams] = useSearchParams();

  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState<UpdateFilters>(() => {
    const initial: UpdateFilters = {
      page: 1,
      page_size: 20,
      sort_by: "date",
    };
    const source = searchParams.get("source");
    const type = searchParams.get("type");
    const sort = searchParams.get("sort");
    if (source) initial.source = source;
    if (type) initial.update_type = type;
    if (sort) initial.sort_by = sort;
    return initial;
  });

  const fetchUpdates = useCallback(
    async (currentFilters: UpdateFilters, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await getUpdates(currentFilters);
        if (append) {
          setUpdates((prev) => [...prev, ...res.items]);
        } else {
          setUpdates(res.items);
        }
        setTotalPages(res.pages);
        setTotalCount(res.total);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUpdates(filters);
  }, [filters, fetchUpdates]);

  const handleFilterChange = (newFilters: UpdateFilters) => {
    const updated = { ...newFilters, page: 1 };
    setFilters(updated);
    setShowMobileFilters(false);
  };

  const handleSortToggle = () => {
    setFilters((prev) => ({
      ...prev,
      sort_by: prev.sort_by === "date" ? "relevance" : "date",
      page: 1,
    }));
  };

  const handleLoadMore = () => {
    const nextPage = (filters.page || 1) + 1;
    const newFilters = { ...filters, page: nextPage };
    setFilters(newFilters);
    fetchUpdates(newFilters, true);
  };

  const currentPage = filters.page || 1;
  const hasMore = currentPage < totalPages;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filter Sidebar (Desktop) */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24">
          <FilterSidebar filters={filters} onChange={handleFilterChange} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Regulatory Feed
            </h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-1">
                {totalCount} update{totalCount !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Toggle */}
            <button
              onClick={handleSortToggle}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">
                {filters.sort_by === "date" ? "Latest" : "Most Relevant"}
              </span>
            </button>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden btn-secondary flex items-center gap-2 text-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Panel */}
        {showMobileFilters && (
          <div className="lg:hidden mb-6">
            <FilterSidebar filters={filters} onChange={handleFilterChange} />
          </div>
        )}

        {/* Updates List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="flex gap-2 mb-3">
                  <div className="skeleton h-5 w-16" />
                  <div className="skeleton h-5 w-20" />
                </div>
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-4 w-full mb-1" />
                <div className="skeleton h-4 w-2/3 mb-3" />
                <div className="skeleton h-3 w-24 mt-3" />
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="card p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No updates found
            </h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters or check back later for new updates.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {updates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {loadingMore ? (
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
