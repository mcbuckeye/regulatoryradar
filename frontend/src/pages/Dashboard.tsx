import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../auth";
import { getUpdates } from "../api";
import type { RegulatoryUpdate } from "../api";
import UpdateCard from "../components/UpdateCard";

interface DashboardStats {
  todayCount: number;
  highPriority: number;
  newTrials: number;
}

function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex gap-2 mb-3">
        <div className="skeleton h-5 w-16" />
        <div className="skeleton h-5 w-20" />
      </div>
      <div className="skeleton h-5 w-3/4 mb-2" />
      <div className="skeleton h-4 w-full mb-1" />
      <div className="skeleton h-4 w-2/3 mb-3" />
      <div className="skeleton h-3 w-24 mt-3" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [topUpdates, setTopUpdates] = useState<RegulatoryUpdate[]>([]);
  const [fdaUpdates, setFdaUpdates] = useState<RegulatoryUpdate[]>([]);
  const [trialUpdates, setTrialUpdates] = useState<RegulatoryUpdate[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayCount: 0,
    highPriority: 0,
    newTrials: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [topRes, fdaRes, trialRes, todayRes] = await Promise.all([
        getUpdates({
          min_relevance: 70,
          sort_by: "relevance",
          page_size: 6,
          page: 1,
        }),
        getUpdates({
          source: "FDA",
          sort_by: "date",
          page_size: 5,
          page: 1,
        }),
        getUpdates({
          update_type: "Trial",
          sort_by: "date",
          page_size: 5,
          page: 1,
        }),
        getUpdates({
          date_from: today,
          page_size: 1,
          page: 1,
        }),
      ]);

      setTopUpdates(topRes.items);
      setFdaUpdates(fdaRes.items);
      setTrialUpdates(trialRes.items);

      const highPriorityCount = topRes.items.filter(
        (u) => u.impact_level?.toLowerCase() === "high"
      ).length;

      setStats({
        todayCount: todayRes.total,
        highPriority: highPriorityCount,
        newTrials: trialRes.total,
      });
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-gray-500 mt-1">
            Here is your regulatory intelligence overview for today.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Updates today"
          value={loading ? "--" : stats.todayCount}
          color="bg-primary-50 text-primary-900"
        />
        <StatCard
          icon={AlertTriangle}
          label="High priority"
          value={loading ? "--" : stats.highPriority}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          icon={FlaskConical}
          label="Clinical trials"
          value={loading ? "--" : stats.newTrials}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Today's Top Updates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Top Relevant Updates
          </h2>
          <Link
            to="/feed?sort=relevance"
            className="text-sm text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : topUpdates.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500">
              No high-relevance updates found. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topUpdates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </section>

      {/* Two-column: FDA + Trials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent FDA Updates */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent FDA Updates
            </h2>
            <Link
              to="/feed?source=FDA"
              className="text-sm text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : fdaUpdates.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500 text-sm">No FDA updates found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fdaUpdates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </section>

        {/* Clinical Trials Activity */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Clinical Trials Activity
            </h2>
            <Link
              to="/feed?type=Trial"
              className="text-sm text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : trialUpdates.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500 text-sm">
                No clinical trial updates found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trialUpdates.map((update) => (
                <UpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
