"use client";

import { useState } from "react";

function parseDemoClicks(raw) {
  const lines = raw.trim().split("\n").filter(l => l.trim());
  const events = [];
  let i = 0;

  while (i < lines.length) {
    const tsMatch = lines[i]?.match(/^[A-Z][a-z]{2}\s+\d{2}\s+\d{2}:\d{2}:\d{2}$/);
    if (!tsMatch) { i++; continue; }

    const timestamp = lines[i];
    const metaJson = lines[i + 3] || "";
    const calendlyUrl = lines[i + 4] || "";

    let workspaceId = "";
    try {
      const meta = JSON.parse(metaJson);
      workspaceId = meta?.customIDs?.workspaceId || "";
    } catch {}

    let aeName = "";
    const urlMatch = calendlyUrl.match(/calendly\.com\/([^/]+)\//);
    if (urlMatch) {
      const parts = urlMatch[1].split("-");
      const nameParts = parts.length >= 3 ? parts.slice(0, -1) : parts;
      aeName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }

    events.push({ timestamp, aeName, workspaceId });
    i += 6;
  }

  return events;
}

function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function eventsToCsv(events) {
  const header = "Account Executive,Workspace ID,Timestamp";
  const rows = events.map((e) =>
    [e.aeName, e.workspaceId, e.timestamp].map(escapeCsvCell).join(",")
  );
  return [header, ...rows].join("\n");
}

function CopySection({ label, items }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(items.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 ml-1">{label}</span>
          <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 hover:cursor-pointer text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-gray-200">
        {items.map((item, i) => (
          <div key={`${label}-${i}-${String(item).slice(0, 20)}`} className="py-0.5">{item}</div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [events, setEvents] = useState([]);
  const [parseError, setParseError] = useState(null);

  const handleParse = () => {
    setParseError(null);
    const parsed = parseDemoClicks(input);
    if (input.trim() && parsed.length === 0) {
      setParseError("Please paste the Statsig event data into your Mac's Text Edit app first. Then copy from Text Edit into the text box above.");
      setEvents([]);
    } else {
      setEvents(parsed);
    }
  };

  const handleExportCsv = () => {
    const csv = eventsToCsv(events);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demo-clicks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-gray-900 dark:text-gray-100">
      <svg
          aria-label="Attio Logo"
          xmlns="http://www.w3.org/2000/svg"
          width="100"
          height="25"
          fill="currentColor"
          viewBox="0 0 120 30"
        >
          <title>Attio Logo</title>
          <path d="M98.128 1.13h-4.933v4.885h4.933z" />
          <path
            fillRule="evenodd"
            d="M78.923 13.673h-4.332v7.94q0 .993.5 1.45.502.459 1.464.535.963.037 2.39-.038v4.467q-5.047.571-7.207-.916-2.119-1.526-2.119-5.496v-7.94h-3.352V8.94h3.352V5.085l4.972-1.488v5.345h7.685V5.087l4.971-1.488v5.346h4.355v4.735h-4.355v7.94q0 .992.5 1.45.502.459 1.464.535.964.037 2.389-.038v4.466q-5.049.572-7.208-.915-2.118-1.526-2.119-5.497v-7.94h-3.352z"
            clipRule="evenodd"
          />
          <path d="M98.153 8.936H93.18v19.088h4.972z" />
          <path
            fillRule="evenodd"
            d="M109.866 8.44c-5.597 0-10.136 4.496-10.136 10.042s4.539 10.04 10.136 10.04 10.135-4.495 10.135-10.04c0-5.546-4.536-10.041-10.135-10.041m-.018 15.35c-2.969 0-5.378-2.386-5.378-5.326s2.409-5.326 5.378-5.326 5.375 2.383 5.375 5.326-2.406 5.326-5.375 5.326M59.751 8.898v1.06a10.16 10.16 0 0 0-5.355-1.517c-5.597 0-10.136 4.495-10.136 10.04 0 5.546 4.54 10.041 10.136 10.041 1.967 0 3.801-.555 5.355-1.517v1.06h4.934V8.898zM54.378 23.79c-2.969 0-5.377-2.386-5.377-5.326s2.408-5.326 5.377-5.326c2.97 0 5.326 2.336 5.373 5.237v.175c-.047 2.9-2.433 5.237-5.373 5.237z"
            clipRule="evenodd"
          />
          <path
            d="m35.705 20.45-3.014-4.778s-.011-.02-.018-.029l-.238-.375a2.44 2.44 0 0 0-2.072-1.142l-4.854-.015-.34.537-5.8 9.195-.32.509 2.43 3.846a2.43 2.43 0 0 0 2.079 1.142h6.803c.839 0 1.633-.438 2.077-1.14l.24-.38s.009-.01.01-.015l3.02-4.784a2.41 2.41 0 0 0 0-2.572zm-.92 2-3.018 4.784q-.021.032-.042.058a.41.41 0 0 1-.652-.06l-3.02-4.784a1.3 1.3 0 0 1-.154-.344 1.37 1.37 0 0 1 0-.737c.034-.118.085-.236.152-.342l3.014-4.78.007-.01a.38.38 0 0 1 .24-.172c.031-.009.058-.011.08-.015h.034c.07 0 .243.022.35.195l3.014 4.777a1.34 1.34 0 0 1 0 1.43zM26.786 8.89a2.42 2.42 0 0 0 0-2.572l-3.014-4.777-.251-.402A2.44 2.44 0 0 0 21.442 0H14.64c-.85 0-1.626.426-2.08 1.142L.378 20.452A2.4 2.4 0 0 0 0 21.738c0 .453.13.9.374 1.284l3.268 5.181a2.44 2.44 0 0 0 2.076 1.14h6.804c.854 0 1.63-.427 2.079-1.142l.248-.391v-.005s.005-.006.005-.008l2.429-3.847 7.198-11.409 2.3-3.649zm-.71-1.286c0 .247-.07.496-.212.715L13.93 27.237a.41.41 0 0 1-.35.19c-.07 0-.24-.02-.35-.19l-3.016-4.786a1.35 1.35 0 0 1 0-1.428L22.15 2.11a.41.41 0 0 1 .35-.193c.069 0 .242.02.352.195l3.013 4.777c.142.22.211.469.211.715"
          />
        </svg>
        </div>
        <div className="mt-20">
          <h1 className="text-3xl tracking-tight font-semibold text-black dark:text-white mb-2">Book a Demo Click Parser</h1>
          <p className="text-gray-700 dark:text-gray-400 text-sm">Get raw event logs from Statsig and paste them into your Mac's Text Edit app. Then copy and paste from Text Edit into the textbox below. This will automatically categorise the data into the right columns individually to copy and paste into Google Sheets. Or use the Export as CSV button to download a CSV file you can import into Google Sheets.</p>
        </div>

        <div className="mt-3">
          <label htmlFor="raw-event-data" className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Raw Event Data</label>
          <textarea
            id="raw-event-data"
            value={input}
            onChange={e => { setInput(e.target.value); setParseError(null); }}
            rows={10}
            placeholder="Paste your raw event log here..."
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 font-mono placeholder-gray-600 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-transparent resize-y"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleParse}
              disabled={!input.trim()}
              className="px-5 py-2.5 disabled:hover:cursor-not-allowed bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 hover:cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 text-gray-100 dark:text-gray-900 text-sm font-medium rounded-lg transition-colors"
            >
              Parse Events
            </button>
            {events.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-5 py-2.5 text-sm hover:cursor-pointer font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 transition-colors"
              >
                Export as CSV
              </button>
            )}
          </div>
          {parseError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 ml-1" role="alert">
              {parseError}
            </p>
          )}
        </div>

        {events.length > 0 && (
          <div className="space-y-6">
            <CopySection
              label="Account Executives"
              items={events.map(e => e.aeName)}
            />
            <CopySection
              label="Workspace IDs"
              items={events.map(e => e.workspaceId)}
            />
            <CopySection
              label="Timestamps"
              items={events.map(e => e.timestamp)}
            />
          </div>
        )}
      </div>
    </div>
  );
}