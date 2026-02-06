import { useState, useEffect } from "react";
import {
  Mail,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getDigests, previewDigest } from "../api";
import type { Digest } from "../api";

export default function Digests() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadDigests();
  }, []);

  const loadDigests = async () => {
    setLoading(true);
    try {
      const res = await getDigests(1, 50);
      setDigests(res.items);
    } catch (err) {
      console.error("Failed to load digests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (previewLoading) return;
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await previewDigest();
      setPreviewHtml(res.html);
    } catch (err) {
      setPreviewHtml(
        `<div style="padding:2rem;text-align:center;color:#666;">
          <p>Failed to generate preview. ${err instanceof Error ? err.message : ""}</p>
        </div>`
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  let digestDate = "";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digest History</h1>
          <p className="text-sm text-gray-500 mt-1">
            View past daily digests and preview today's summary.
          </p>
        </div>
        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="btn-primary flex items-center gap-2 text-sm self-start"
        >
          {previewLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Preview Today's Digest
        </button>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="card mb-6">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-50">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary-700" />
              <h3 className="font-semibold text-primary-900">
                Today's Digest Preview
              </h3>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="p-6">
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="ml-3 text-gray-500">
                  Generating preview...
                </span>
              </div>
            ) : (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </div>
      )}

      {/* Digest List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-5 w-20 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : digests.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No digests yet
          </h3>
          <p className="text-gray-500 text-sm">
            Digests will appear here once they are generated. Enable daily
            digests in Settings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((digest) => {
            try {
              digestDate = format(parseISO(digest.date), "EEEE, MMMM d, yyyy");
            } catch {
              digestDate = digest.date;
            }

            const isExpanded = expandedId === digest.id;

            return (
              <div key={digest.id} className="card overflow-hidden">
                <button
                  onClick={() => toggleExpand(digest.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 text-sm">
                        {digestDate}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {digest.update_count} update
                      {digest.update_count !== 1 ? "s" : ""}
                    </span>
                    {digest.delivered ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Not delivered
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {digest.html_content ? (
                      <div
                        className="prose prose-sm max-w-none bg-white rounded-lg p-6 border border-gray-200"
                        dangerouslySetInnerHTML={{
                          __html: digest.html_content,
                        }}
                      />
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No content available for this digest.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
