import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { logError, logVerbose } from "../shared/log.js";

/**
 * Session metadata stored in SQLite.
 */
export interface SessionRecord {
	id: string;
	startedAt: number;
	lastActiveAt: number;
	/** Total duration in seconds (updated on idle/error). */
	durationSec: number;
	/** Number of tool calls observed. */
	toolCalls: number;
	/** Number of messages observed. */
	messages: number;
	/** Last known status: "active" | "idle" | "error". */
	status: string;
}

const DB_FILENAME = "luthier-sessions.sqlite";

/**
 * Persistent session state store backed by bun:sqlite.
 *
 * Stores session metadata (start time, duration, tool calls, messages)
 * for analytics and recovery. DB lives in the project's `.opencode/` dir.
 */
export class SessionStore {
	private db: Database;

	constructor(projectDirectory: string) {
		const dbDir = join(projectDirectory, ".opencode");
		const dbPath = join(dbDir, DB_FILENAME);

		if (!existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}

		this.db = new Database(dbPath);
		this.db.exec("PRAGMA journal_mode=WAL;");
		this.init();
	}

	private init(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				started_at INTEGER NOT NULL,
				last_active_at INTEGER NOT NULL,
				duration_sec REAL DEFAULT 0,
				tool_calls INTEGER DEFAULT 0,
				messages INTEGER DEFAULT 0,
				status TEXT DEFAULT 'active'
			);
		`);
		logVerbose("Session store initialized");
	}

	/**
	 * Record a new session start.
	 */
	upsertSession(sessionId: string): void {
		try {
			const now = Date.now();
			this.db
				.prepare(
					`INSERT INTO sessions (id, started_at, last_active_at, status)
				 VALUES (?, ?, ?, 'active')
				 ON CONFLICT(id) DO UPDATE SET last_active_at = ?, status = 'active'`,
				)
				.run(sessionId, now, now, now);
		} catch (err) {
			logError("Failed to upsert session", err);
		}
	}

	/**
	 * Update session on activity (tool call, message, etc.)
	 */
	recordActivity(sessionId: string, type: "tool_call" | "message"): void {
		try {
			const now = Date.now();
			const column = type === "tool_call" ? "tool_calls" : "messages";
			this.db
				.prepare(`UPDATE sessions SET ${column} = ${column} + 1, last_active_at = ? WHERE id = ?`)
				.run(now, sessionId);
		} catch (err) {
			logError("Failed to record activity", err);
		}
	}

	/**
	 * Mark session as idle and compute duration.
	 */
	markIdle(sessionId: string): void {
		try {
			const now = Date.now();
			this.db
				.prepare(
					`UPDATE sessions SET
					status = 'idle',
					last_active_at = ?,
					duration_sec = CAST((? - started_at) AS REAL) / 1000.0
				 WHERE id = ?`,
				)
				.run(now, now, sessionId);
		} catch (err) {
			logError("Failed to mark session idle", err);
		}
	}

	/**
	 * Mark session as errored.
	 */
	markError(sessionId: string): void {
		try {
			const now = Date.now();
			this.db
				.prepare(
					`UPDATE sessions SET
					status = 'error',
					last_active_at = ?,
					duration_sec = CAST((? - started_at) AS REAL) / 1000.0
				 WHERE id = ?`,
				)
				.run(now, now, sessionId);
		} catch (err) {
			logError("Failed to mark session error", err);
		}
	}

	/**
	 * Get a session record by ID.
	 */
	getSession(sessionId: string): SessionRecord | undefined {
		try {
			const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as Record<
				string,
				unknown
			> | null;

			if (!row) return undefined;

			return {
				id: row.id as string,
				startedAt: row.started_at as number,
				lastActiveAt: row.last_active_at as number,
				durationSec: row.duration_sec as number,
				toolCalls: row.tool_calls as number,
				messages: row.messages as number,
				status: row.status as string,
			};
		} catch (err) {
			logError("Failed to get session", err);
			return undefined;
		}
	}

	/**
	 * Get recent sessions ordered by last activity.
	 */
	getRecentSessions(limit = 10): SessionRecord[] {
		try {
			const rows = this.db.prepare("SELECT * FROM sessions ORDER BY last_active_at DESC LIMIT ?").all(limit) as Array<
				Record<string, unknown>
			>;

			return rows.map((row) => ({
				id: row.id as string,
				startedAt: row.started_at as number,
				lastActiveAt: row.last_active_at as number,
				durationSec: row.duration_sec as number,
				toolCalls: row.tool_calls as number,
				messages: row.messages as number,
				status: row.status as string,
			}));
		} catch (err) {
			logError("Failed to get recent sessions", err);
			return [];
		}
	}

	/**
	 * Close the database connection.
	 */
	close(): void {
		this.db.close();
	}
}
