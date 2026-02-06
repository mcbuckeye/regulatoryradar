import { BookOpen, Bell, Search, Settings, Clock, Bookmark, RefreshCw, Mail } from "lucide-react";

export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Guide</h1>
        <p className="text-gray-600">
          Learn how to use RegulatoryRadar to stay on top of regulatory updates in your therapeutic areas.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">What is RegulatoryRadar?</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            RegulatoryRadar automatically monitors regulatory sources and clinical trial databases to keep you
            informed about updates relevant to your therapeutic areas. It covers:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>FDA Guidances</strong> — New and updated guidance documents from the FDA</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>FDA Approvals</strong> — Drug approvals, supplemental approvals, and label changes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>ClinicalTrials.gov</strong> — New and updated clinical trials matching your keywords</span>
            </li>
          </ul>
          <p className="text-gray-700 mt-4">
            Each update is analyzed by AI to provide relevance scores and summaries, helping you quickly identify
            what matters most.
          </p>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            The Dashboard gives you a quick overview of recent activity:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Stats Cards</strong> — Total updates, high-relevance items, unread count</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Recent Updates</strong> — Latest regulatory news with relevance scores</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Watched Companies</strong> — Quick view of updates mentioning your tracked companies</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Feed */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Feed</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            The Feed shows all regulatory updates with powerful filtering options:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Source Filter</strong> — Show only FDA, ClinicalTrials, or all sources</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Date Range</strong> — Filter by publication date</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Relevance</strong> — Sort by AI-calculated relevance to your interests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Bookmark</strong> — Save important updates for later reference</span>
            </li>
          </ul>
          <p className="text-gray-700 mt-4">
            Click any update to see full details, AI summary, and key points.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Search</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            Full-text search across all regulatory updates:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Search by keyword, drug name, company, or therapeutic area</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Save frequently-used searches for quick access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Results ranked by relevance and recency</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Digests */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Daily Digests</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            Get a summary of the most important updates delivered daily:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Automatic Generation</strong> — Digests are created at 7 AM ET</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Relevance Filtered</strong> — Only includes updates above your relevance threshold</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>View History</strong> — Access past digests anytime from the Digests page</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Settings */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            Customize RegulatoryRadar to match your interests:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Therapeutic Areas</h3>
              <p className="text-gray-600 text-sm">
                Add therapeutic areas you want to track (e.g., "Oncology", "Hematology", "CLL").
                Include related keywords to improve matching (e.g., for CLL: "chronic lymphocytic leukemia",
                "BTK inhibitor", "venetoclax").
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Watched Companies</h3>
              <p className="text-gray-600 text-sm">
                Track specific pharmaceutical companies to see when they're mentioned in regulatory updates.
                Great for competitive intelligence and partnership monitoring.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Notification Preferences</h3>
              <p className="text-gray-600 text-sm">
                Configure email notifications and digest frequency to match your workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Collection */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">How Data is Collected</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 mb-4">
            RegulatoryRadar automatically scrapes regulatory sources on a schedule:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Automatic Scraping</strong> — Runs every 6 hours to check for new updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>AI Analysis</strong> — New updates are automatically analyzed for relevance and summarized</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Deduplication</strong> — Updates are tracked by source ID to avoid duplicates</span>
            </li>
          </ul>
          <p className="text-gray-700 mt-4 text-sm">
            <strong>Note:</strong> Admins can trigger a manual scrape from the admin panel if needed.
          </p>
        </div>
      </section>

      {/* Tips */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Tips for Best Results</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Add specific keywords to your therapeutic areas (drug names, mechanisms, indications)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Use bookmarks to track updates you need to follow up on</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Save searches for queries you run frequently</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Check the Dashboard daily for high-relevance updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Review digests for a curated summary of what you might have missed</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
