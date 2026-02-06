import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Clock,
  AlertTriangle,
  Lightbulb,
  FileText,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getUpdate, bookmarkUpdate, markAsRead } from "../api";
import type { RegulatoryUpdate } from "../api";
import RelevanceBadge from "../components/RelevanceBadge";

function getSourceStyle(source: string): { bg: string; text: string } {
  const s = source.toLowerCase();
  if (s.includes("fda")) return { bg: "bg-blue-100", text: "text-blue-800" };
  if (s.includes("clinical") || s.includes("trial"))
    return { bg: "bg-emerald-100", text: "text-emerald-800" };
  return { bg: "bg-gray-100", text: "text-gray-700" };
}

function getImpactStyle(level: string | null) {
  if (!level) return null;
  const l = level.toLowerCase();
  if (l === "high")
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-500",
    };
  if (l === "medium")
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      icon: "text-amber-500",
    };
  return {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: "text-gray-400",
  };
}

export default function UpdateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [update, setUpdate] = useState<RegulatoryUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchUpdate = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getUpdate(Number(id));
        setUpdate(data);
        setBookmarked(data.is_bookmarked ?? false);
        // Mark as read
        markAsRead(Number(id)).catch(() => {});
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load update."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchUpdate();
  }, [id]);

  const handleBookmark = async () => {
    if (!update || bookmarking) return;
    setBookmarking(true);
    try {
      const result = await bookmarkUpdate(update.id);
      setBookmarked(result.bookmarked);
    } catch {
      // Silently handle
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-8 w-32 mb-6" />
        <div className="card p-8">
          <div className="skeleton h-8 w-3/4 mb-4" />
          <div className="flex gap-2 mb-6">
            <div className="skeleton h-6 w-16" />
            <div className="skeleton h-6 w-20" />
            <div className="skeleton h-6 w-24" />
          </div>
          <div className="skeleton h-32 w-full mb-6" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="card p-12 text-center">
          <p className="text-red-600 font-medium">
            {error || "Update not found."}
          </p>
          <Link to="/feed" className="btn-primary mt-4 inline-block">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  const sourceStyle = getSourceStyle(update.source);
  const impactStyle = getImpactStyle(update.impact_level);

  let publishedDate = "";
  try {
    publishedDate = format(
      parseISO(update.published_date),
      "MMMM d, yyyy 'at' h:mm a"
    );
  } catch {
    publishedDate = update.published_date;
  }

  const keyPoints: string[] = update.key_points || [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </button>

      <article className="card">
        <div className="p-6 sm:p-8">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${sourceStyle.bg} ${sourceStyle.text}`}
            >
              {update.source}
            </span>
            {update.update_type && (
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-800">
                {update.update_type}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {publishedDate}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
            {update.title}
          </h1>

          {/* Action Row */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            <RelevanceBadge score={update.relevance_score} size="lg" />

            <button
              onClick={handleBookmark}
              disabled={bookmarking}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                bookmarked
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-gray-300 text-gray-600 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <Star
                className="w-4 h-4"
                fill={bookmarked ? "currentColor" : "none"}
              />
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>

            {update.source_url && (
              <a
                href={update.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Original
              </a>
            )}
          </div>

          {/* AI Summary */}
          {update.ai_summary && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary-700" />
                <h2 className="font-semibold text-primary-900">AI Summary</h2>
              </div>
              <p className="text-primary-800 leading-relaxed text-sm">
                {update.ai_summary}
              </p>
            </div>
          )}

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Key Points</h2>
              </div>
              <ul className="space-y-2">
                {keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-gray-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impact Assessment */}
          {update.impact_assessment && impactStyle && (
            <div
              className={`rounded-xl p-5 mb-6 border ${impactStyle.bg} ${impactStyle.border}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={`w-5 h-5 ${impactStyle.icon}`} />
                <h2 className={`font-semibold ${impactStyle.text}`}>
                  Impact Assessment
                  {update.impact_level && (
                    <span className="ml-2 text-sm font-normal">
                      ({update.impact_level})
                    </span>
                  )}
                </h2>
              </div>
              <p className={`text-sm leading-relaxed ${impactStyle.text}`}>
                {update.impact_assessment}
              </p>
            </div>
          )}

          {/* Full Content */}
          {update.content && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Full Content</h2>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {update.content}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
