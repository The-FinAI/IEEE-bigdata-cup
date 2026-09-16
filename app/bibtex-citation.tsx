"use client";

import { useState } from "react";
import styles from "./paper-guidance.module.css";

export function BibtexCitation({
  bibtex,
  downloadUrl,
}: {
  bibtex: string;
  downloadUrl: string;
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
        <span>Published ACL 2026 BibTeX</span>
        <div className={styles.bibtexActions}>
          <button type="button" onClick={copyCitation}>
            {copyStatus === "copied" ? "Copied" : "Copy BibTeX"}
          </button>
          <a href={downloadUrl} download="finchain.bib">Download .bib</a>
        </div>
      </div>
      <pre tabIndex={0} aria-label="FinChain BibTeX citation"><code>{bibtex}</code></pre>
      <p className={styles.copyStatus} role="status" aria-live="polite">
        {copyStatus === "copied" && "BibTeX copied to clipboard."}
        {copyStatus === "failed" && "Select the BibTeX text above to copy it, or download the .bib file."}
      </p>
    </div>
  );
}
