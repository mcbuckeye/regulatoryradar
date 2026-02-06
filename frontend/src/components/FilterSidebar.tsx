import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { UpdateFilters } from "../api";

interface FilterSidebarProps {
  filters: UpdateFilters;
  onChange: (filters: UpdateFilters) => void;
  className?: string;
}

const SOURCES = [
  { value: "FDA", label: "FDA" },
  { value: "ClinicalTrials", label: "ClinicalTrials.gov" },
];

const UPDATE_TYPES = [
  { value: "Guidance", label: "Guidance" },
  { value: "Approval", label: "Approval" },
  { value: "Safety", label: "Safety Alert" },
  { value: "Trial", label: "Clinical Trial" },
];

export default function FilterSidebar({
  filters,
  onChange,
  className = "",
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<UpdateFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSourceChange = (source: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      source: prev.source === source ? undefined : source,
    }));
  };

  const handleTypeChange = (type: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      update_type: prev.update_type === type ? undefined : type,
    }));
  };

  const handleApply = () => {
    onChange(localFilters);
  };

  const handleClear = () => {
    const cleared: UpdateFilters = {
      page: 1,
      page_size: filters.page_size,
      sort_by: filters.sort_by,
    };
    setLocalFilters(cleared);
    onChange(cleared);
  };

  const hasActiveFilters =
    localFilters.source ||
    localFilters.update_type ||
    localFilters.min_relevance ||
    localFilters.max_relevance ||
    localFilters.date_from ||
    localFilters.date_to;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="text-xs text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Source */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2.5">Source</h4>
        <div className="space-y-2">
          {SOURCES.map((source) => (
            <label
              key={source.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={localFilters.source === source.value}
                onChange={() => handleSourceChange(source.value)}
                className="w-4 h-4 rounded border-gray-300 text-primary-900 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                {source.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Update Type */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2.5">
          Update Type
        </h4>
        <div className="space-y-2">
          {UPDATE_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={localFilters.update_type === type.value}
                onChange={() => handleTypeChange(type.value)}
                className="w-4 h-4 rounded border-gray-300 text-primary-900 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Relevance Range */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2.5">
          Relevance Score
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Min"
            value={localFilters.min_relevance ?? ""}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                min_relevance: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              }))
            }
            className="input-field text-sm !py-1.5 w-20"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Max"
            value={localFilters.max_relevance ?? ""}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                max_relevance: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              }))
            }
            className="input-field text-sm !py-1.5 w-20"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2.5">
          Date Range
        </h4>
        <div className="space-y-2">
          <input
            type="date"
            value={localFilters.date_from ?? ""}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                date_from: e.target.value || undefined,
              }))
            }
            className="input-field text-sm !py-1.5"
            placeholder="From"
          />
          <input
            type="date"
            value={localFilters.date_to ?? ""}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                date_to: e.target.value || undefined,
              }))
            }
            className="input-field text-sm !py-1.5"
            placeholder="To"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={handleApply} className="btn-primary flex-1 text-sm">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
