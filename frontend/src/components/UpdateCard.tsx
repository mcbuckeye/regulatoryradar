import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, ExternalLink, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { RegulatoryUpdate } from "../api";
import { bookmarkUpdate } from "../api";
import RelevanceBadge from "./RelevanceBadge";

interface UpdateCardProps {
  update: RegulatoryUpdate;
  onBookmarkChange?: (id: number, bookmarked: boolean) => void;
}

function getSourceStyle(source: string): { bg: string; text: string } {
  const s = source.toLowerCase();
  if (s.includes("fda")) {
    return { bg: "bg-blue-100", text: "text-blue-800" };
  }
  if (s.includes("clinical") || s.includes("trial")) {
    return { bg: "bg-emerald-100", text: "text-emerald-800" };
  }
  return { bg: "bg-gray-100", text: "text-gray-700" };
}

function getImpactStyle(
  level: string | null
): { bg: string; text: string } | null {
  if (!level) return null;
  const l = level.toLowerCase();
  if (l === "high") return { bg: "bg-red-100", text: "text-red-800" };
  if (l === "medium") return { bg: "bg-amber-100", text: "text-amber-800" };
  if (l === "low") return { bg: "bg-gray-100", text: "text-gray-600" };
  return null;
}

export default function UpdateCard({
  update,
  onBookmarkChange,
}: UpdateCardProps) {
  const [bookmarked, setBookmarked] = useState(update.is_bookmarked ?? false);
  const [bookmarking, setBookmarking] = useState(false);

  const sourceStyle = getSourceStyle(update.source);
  const impactStyle = getImpactStyle(update.impact_level);

  const displaySummary =
    update.ai_summary || update.summary || update.content || "";
  const truncatedSummary =
    displaySummary.length > 180
      ? displaySummary.substring(0, 180) + "..."
      : displaySummary;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bookmarking) return;
    setBookmarking(true);
    try {
      const result = await bookmarkUpdate(update.id);
      setBookmarked(result.bookmarked);
      onBookmarkChange?.(update.id, result.bookmarked);
    } catch {
      // Silently handle error
    } finally {
      setBookmarking(false);
    }
  };

  let publishedDate = "";
  try {
    publishedDate = format(parseISO(update.published_date), "MMM d, yyyy");
  } catch {
    publishedDate = update.published_date;
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 group">
      <div className="p-5">
        {/* Top Row: Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${sourceStyle.bg} ${sourceStyle.text}`}
          >
            {update.source}
          </span>
          {update.update_type && (
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-800">
              {update.update_type}
            </span>
          )}
          {impactStyle && (
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${impactStyle.bg} ${impactStyle.text}`}
            >
              {update.impact_level} Impact
            </span>
          )}
          <div className="ml-auto">
            <RelevanceBadge score={update.relevance_score} size="sm" />
          </div>
        </div>

        {/* Title */}
        <Link
          to={`/updates/${update.id}`}
          className="block text-base font-semibold text-gray-900 group-hover:text-primary-900 transition-colors leading-snug mb-2"
        >
          {update.title}
        </Link>

        {/* Summary */}
        {truncatedSummary && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            {truncatedSummary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{publishedDate}</span>
          </div>

          <div className="flex items-center gap-2">
            {update.source_url && (
              <a
                href={update.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-400 hover:text-primary-700 transition-colors"
                title="View original"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handleBookmark}
              disabled={bookmarking}
              className={`p-1.5 transition-colors ${
                bookmarked
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-gray-400 hover:text-amber-500"
              }`}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Star
                className="w-4 h-4"
                fill={bookmarked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
