"use client";

import { useState } from "react";

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
    <div className="bibtex-citation">
      <div className="bibtex-actions">
        <button type="button" onClick={copyCitation}>
          {copyStatus === "copied" ? "Copied" : "Copy BibTeX"}
        </button>
        <a href={downloadUrl} download="finchain.bib">Download .bib</a>
      </div>
      <pre tabIndex={0} aria-label="FinChain BibTeX citation"><code>{bibtex}</code></pre>
      <p className="bibtex-copy-status" role="status">
        {copyStatus === "copied" && "BibTeX copied to clipboard."}
        {copyStatus === "failed" && "Select the BibTeX text above to copy it, or download the .bib file."}
      </p>
    </div>
  );
}
