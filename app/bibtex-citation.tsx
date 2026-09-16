"use client";

import { useState } from "react";
import styles from "./paper-guidance.module.css";

export function BibtexCitation({
  bibtex,
  downloadUrl,
  label = "Published ACL 2026 BibTeX",
  citationName = "FinChain",
}: {
  bibtex: string;
  downloadUrl: string;
  label?: string;
  citationName?: string;
}) {
  const [copyStatus, setCopyStatus] = useState<"ready" | "copied" | "failed">("ready");

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className={styles.bibtex}>
      <div className={styles.bibtexToolbar}>
        <span>{label}</span>
        <div className={styles.bibtexActions}>
          <button type="button" onClick={copyCitation}>
            {copyStatus === "copied" ? "Copied" : "Copy BibTeX"}
          </button>
          <a href={downloadUrl} download>Download .bib</a>
        </div>
      </div>
      <pre tabIndex={0} aria-label={`${citationName} BibTeX citation`}><code>{bibtex}</code></pre>
      <p className={styles.copyStatus} role="status" aria-live="polite">
        {copyStatus === "copied" && "BibTeX copied to clipboard."}
        {copyStatus === "failed" && "Select the BibTeX text above to copy it, or download the .bib file."}
      </p>
    </div>
  );
}
