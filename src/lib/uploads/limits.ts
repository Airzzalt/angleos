// Upload limits in one place. Raise them here if a real project needs more.
export const MB = 1024 * 1024;

export const LIMITS = {
  /** One upload (a zip or a single file). Must stay under the server action body limit in next.config.ts. */
  maxUploadBytes: 25 * MB,
  /** One document, or one file inside a zip, after unpacking. */
  maxFileBytes: 15 * MB,
  /** Everything inside one zip after unpacking. */
  maxUnpackedBytes: 60 * MB,
  maxZipEntries: 400,
  /** A file that expands more than this many times (and is over 1 MB) is treated as a zip bomb. */
  maxRatio: 200,
  maxPdfPages: 300,
  maxCharsPerFile: 800_000,
  maxCharsPerProject: 3_000_000,
  maxCharsPerMember: 15_000_000,
  maxFilesPerProject: 300,
  maxProjectsPerMember: 30,
  /** Upload requests per 15 minutes. */
  uploadsPer15Min: { member: 30, admin: 120 },
} as const;

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md", "markdown", "csv"] as const;
