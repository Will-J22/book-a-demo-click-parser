import { NextResponse } from "next/server";

const ASHBY_JOB_POSTING_LIST_URL = "https://api.ashbyhq.com/jobPosting.list";
const ASHBY_JOB_POSTING_INFO_URL = "https://api.ashbyhq.com/jobPosting.info";

const OMIT_FROM_LIST_JOB = [
	"updatedAt",
	"locationIds",
	"shouldDisplayCompensationOnJobBoard",
	"isListed",
	"locationExternalName",
    "jobId",
    "id",
    "publishedDate",
    "applicationDeadline",
    "applyLink",
    "departmentName",
];

function getAuthHeaders(apiKey) {
	const credentials = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
	return {
		"Content-Type": "application/json",
		Accept: "application/json",
		Authorization: `Basic ${credentials}`,
	};
}

/**
 * Returns a copy of the job with specified keys omitted.
 */
function sanitizeListJob(job) {
	const out = { ...job };
	for (const key of OMIT_FROM_LIST_JOB) {
		delete out[key];
	}
	return out;
}

/**
 * Cleans plain-text description: replaces newlines with space and collapses whitespace.
 * Only runs when there is actual content; returns null for null/undefined/empty or non-string.
 */
function cleanDescriptionPlain(text) {
	if (text == null || typeof text !== "string") return null;
	const cleaned = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
	return cleaned === "" ? null : cleaned;
}

/**
 * Fetches job posting info and returns descriptionPlain, or null on failure.
 * Logs reason when null so we can audit rate limits vs missing data.
 */
async function fetchDescriptionPlain(apiKey, jobPostingId) {
	try {
		const response = await fetch(ASHBY_JOB_POSTING_INFO_URL, {
			method: "POST",
			headers: getAuthHeaders(apiKey),
			body: JSON.stringify({ jobPostingId }),
		});
		if (!response.ok) {
			const body = await response.text();
			console.error(
				`[fetch-attio-jobs] jobPosting.info failed for ${jobPostingId}: status=${response.status} body=${body.slice(0, 200)}`
			);
			return null;
		}
		const data = await response.json();
		const results = data?.results;
		const plain = results?.descriptionPlain ?? null;
		if (plain == null && results != null) {
			console.error(
				`[fetch-attio-jobs] jobPosting.info no descriptionPlain for ${jobPostingId}: results keys=${Object.keys(results ?? {}).join(",")}`
			);
		}
		return plain;
	} catch (err) {
		console.error(
			`[fetch-attio-jobs] jobPosting.info threw for ${jobPostingId}:`,
			err?.message ?? err
		);
		return null;
	}
}

const DESCRIPTION_REQUEST_DELAY_MS = 100;

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read-only GET. Fetches job postings from Ashby, filters to listed and active only,
 * omits specified fields, attaches cleaned descriptionPlain. Publicly callable; does not write.
 */
export async function GET(_request) {
	const apiKey = process.env.ASHBY_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "ASHBY_API_KEY is not configured" },
			{ status: 500 }
		);
	}

	try {
		const headers = getAuthHeaders(apiKey);

		const listResponse = await fetch(ASHBY_JOB_POSTING_LIST_URL, {
			method: "POST",
			headers,
			body: JSON.stringify({}),
		});

		if (!listResponse.ok) {
			const text = await listResponse.text();
			console.error("Ashby job list error:", listResponse.status, text);
			return NextResponse.json(
				{ error: "Ashby API request failed", details: text },
				{ status: listResponse.status }
			);
		}

		const listData = await listResponse.json();
		const rawResults = listData.results ?? [];

		const listedAndActive = rawResults.filter(
			(job) =>
				job.isListed === true &&
				job.status !== "Closed" &&
				job.status !== "closed"
		);

		const jobsWithDescriptions = [];
		for (let i = 0; i < listedAndActive.length; i++) {
			if (i > 0) {
				await delay(DESCRIPTION_REQUEST_DELAY_MS);
			}
			const job = listedAndActive[i];
			const sanitized = sanitizeListJob(job);
			const raw = await fetchDescriptionPlain(apiKey, job.id);
			const descriptionPlain = cleanDescriptionPlain(raw);
			jobsWithDescriptions.push({ ...sanitized, descriptionPlain });
		}

		return NextResponse.json({ results: jobsWithDescriptions });
	} catch (error) {
		console.error("Error fetching Ashby jobs:", error);
		return NextResponse.json(
			{ error: "Failed to fetch jobs" },
			{ status: 500 }
		);
	}
}
