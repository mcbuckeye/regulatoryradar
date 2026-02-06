import { useState, useEffect, FormEvent } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Building2,
  FlaskConical,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getSettings,
  updateSettings,
  getTherapeuticAreas,
  addTherapeuticArea,
  updateTherapeuticArea,
  deleteTherapeuticArea,
  getWatchedCompanies,
  addWatchedCompany,
  deleteWatchedCompany,
} from "../api";
import type {
  DigestSettings,
  TherapeuticArea,
  WatchedCompany,
} from "../api";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<
    "digest" | "areas" | "companies"
  >("digest");

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // ── Digest Settings ─────────────────────────────────────────────────
  const [digestSettings, setDigestSettings] = useState<DigestSettings>({
    digest_enabled: false,
    digest_time: "08:00",
    digest_email: "",
  });
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestSaving, setDigestSaving] = useState(false);

  useEffect(() => {
    loadDigestSettings();
  }, []);

  const loadDigestSettings = async () => {
    setDigestLoading(true);
    try {
      const settings = await getSettings();
      setDigestSettings(settings);
    } catch {
      // Use defaults
    } finally {
      setDigestLoading(false);
    }
  };

  const handleSaveDigest = async (e: FormEvent) => {
    e.preventDefault();
    setDigestSaving(true);
    try {
      const updated = await updateSettings(digestSettings);
      setDigestSettings(updated);
      showToast("success", "Digest settings saved successfully.");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to save settings."
      );
    } finally {
      setDigestSaving(false);
    }
  };

  // ── Therapeutic Areas ───────────────────────────────────────────────
  const [areas, setAreas] = useState<TherapeuticArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaKeywords, setNewAreaKeywords] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [editAreaKeywords, setEditAreaKeywords] = useState("");
  const [addingArea, setAddingArea] = useState(false);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setAreasLoading(true);
    try {
      const data = await getTherapeuticAreas();
      setAreas(data);
    } catch {
      // Silently handle
    } finally {
      setAreasLoading(false);
    }
  };

  const handleAddArea = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setAddingArea(true);
    try {
      const keywords = newAreaKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const created = await addTherapeuticArea(newAreaName.trim(), keywords);
      setAreas((prev) => [...prev, created]);
      setNewAreaName("");
      setNewAreaKeywords("");
      showToast("success", `Therapeutic area "${created.name}" added.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to add area."
      );
    } finally {
      setAddingArea(false);
    }
  };

  const handleStartEditArea = (area: TherapeuticArea) => {
    setEditingAreaId(area.id);
    setEditAreaName(area.name);
    setEditAreaKeywords(area.keywords.join(", "));
  };

  const handleCancelEditArea = () => {
    setEditingAreaId(null);
    setEditAreaName("");
    setEditAreaKeywords("");
  };

  const handleSaveEditArea = async (id: number) => {
    try {
      const keywords = editAreaKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const updated = await updateTherapeuticArea(
        id,
        editAreaName.trim(),
        keywords
      );
      setAreas((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingAreaId(null);
      showToast("success", "Therapeutic area updated.");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update area."
      );
    }
  };

  const handleDeleteArea = async (id: number, name: string) => {
    if (!window.confirm(`Delete therapeutic area "${name}"?`)) return;
    try {
      await deleteTherapeuticArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      showToast("success", `"${name}" deleted.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to delete area."
      );
    }
  };

  // ── Watched Companies ───────────────────────────────────────────────
  const [companies, setCompanies] = useState<WatchedCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyAliases, setNewCompanyAliases] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const data = await getWatchedCompanies();
      setCompanies(data);
    } catch {
      // Silently handle
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleAddCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setAddingCompany(true);
    try {
      const aliases = newCompanyAliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const created = await addWatchedCompany(newCompanyName.trim(), aliases);
      setCompanies((prev) => [...prev, created]);
      setNewCompanyName("");
      setNewCompanyAliases("");
      showToast("success", `"${created.name}" added to watched companies.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to add company."
      );
    } finally {
      setAddingCompany(false);
    }
  };

  const handleDeleteCompany = async (id: number, name: string) => {
    if (!window.confirm(`Remove "${name}" from watched companies?`)) return;
    try {
      await deleteWatchedCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      showToast("success", `"${name}" removed.`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to remove company."
      );
    }
  };

  const tabs = [
    { key: "digest" as const, label: "Digest Settings", icon: Mail },
    { key: "areas" as const, label: "Therapeutic Areas", icon: FlaskConical },
    { key: "companies" as const, label: "Watched Companies", icon: Building2 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Toast Messages */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-white text-primary-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Digest Settings Tab */}
      {activeTab === "digest" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Email Digest Settings
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Configure your daily regulatory intelligence digest delivered to
            your inbox.
          </p>

          {digestLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSaveDigest} className="space-y-5">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    Daily Digest
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Receive a daily summary of relevant updates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDigestSettings((prev) => ({
                      ...prev,
                      digest_enabled: !prev.digest_enabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    digestSettings.digest_enabled
                      ? "bg-primary-900"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      digestSettings.digest_enabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Delivery Time
                </label>
                <input
                  type="time"
                  value={digestSettings.digest_time}
                  onChange={(e) =>
                    setDigestSettings((prev) => ({
                      ...prev,
                      digest_time: e.target.value,
                    }))
                  }
                  className="input-field max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">UTC timezone</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Delivery Email
                </label>
                <input
                  type="email"
                  value={digestSettings.digest_email}
                  onChange={(e) =>
                    setDigestSettings((prev) => ({
                      ...prev,
                      digest_email: e.target.value,
                    }))
                  }
                  className="input-field max-w-md"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={digestSaving}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {digestSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Digest Settings
              </button>
            </form>
          )}
        </div>
      )}

      {/* Therapeutic Areas Tab */}
      {activeTab === "areas" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Therapeutic Areas
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Define your therapeutic areas of interest to improve update
            relevance scoring.
          </p>

          {/* Add Form */}
          <form
            onSubmit={handleAddArea}
            className="bg-gray-50 rounded-lg p-4 mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Area Name
                </label>
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., Oncology"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={newAreaKeywords}
                  onChange={(e) => setNewAreaKeywords(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., cancer, tumor, chemotherapy"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addingArea || !newAreaName.trim()}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              {addingArea ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Area
            </button>
          </form>

          {/* List */}
          {areasLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))}
            </div>
          ) : areas.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No therapeutic areas defined yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                >
                  {editingAreaId === area.id ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editAreaName}
                        onChange={(e) => setEditAreaName(e.target.value)}
                        className="input-field text-sm"
                        placeholder="Area name"
                      />
                      <input
                        type="text"
                        value={editAreaKeywords}
                        onChange={(e) => setEditAreaKeywords(e.target.value)}
                        className="input-field text-sm"
                        placeholder="Keywords, comma-separated"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEditArea(area.id)}
                          className="text-sm text-green-700 hover:text-green-800 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                        <button
                          onClick={handleCancelEditArea}
                          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {area.name}
                        </p>
                        {area.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {area.keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditArea(area)}
                          className="p-1.5 text-gray-400 hover:text-primary-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteArea(area.id, area.name)
                          }
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watched Companies Tab */}
      {activeTab === "companies" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Watched Companies
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Track specific pharmaceutical companies and their regulatory
            activities.
          </p>

          {/* Add Form */}
          <form
            onSubmit={handleAddCompany}
            className="bg-gray-50 rounded-lg p-4 mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., Pfizer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  value={newCompanyAliases}
                  onChange={(e) => setNewCompanyAliases(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., Pfizer Inc, PFE"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addingCompany || !newCompanyName.trim()}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              {addingCompany ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Company
            </button>
          </form>

          {/* List */}
          {companiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No watched companies yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {company.name}
                    </p>
                    {company.aliases.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Also: {company.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteCompany(company.id, company.name)
                    }
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
