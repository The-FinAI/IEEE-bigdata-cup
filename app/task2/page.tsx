import type { Metadata } from "next";
import Link from "next/link";

const datasetUrl = "https://huggingface.co/datasets/TheFinAI/Herculean";
const trainingFiles = ["prices.parquet", "news.parquet", "filings.parquet"];

export const metadata: Metadata = {
  title: "Task 2 Training Data | FinReason Cup",
  description: "HERCULEAN training data for Task 2 Market-Neutral Hedging: prices, news, and corporate filings.",
  alternates: { canonical: "https://the-finai.github.io/IEEE-bigdata-cup/task2/" },
};

export default function Task2HubPage() {
  return (
    <main className="task-hub-page task1-page">
      <nav className="task-hub-nav" aria-label="Task 2 navigation">
        <Link className="task-hub-brand" href="/">
          <span className="task-hub-brand-mark" aria-hidden="true">FR</span>
          <span><strong>FinReason Cup</strong><small>IEEE Big Data 2026</small></span>
        </Link>
        <div className="task-hub-nav-links">
          <Link href="/task1/">Task 1</Link>
          <Link href="/task2/" aria-current="page">Task 2 data</Link>
        </div>
      </nav>

      <header className="task-hub-heading">
        <div className="task-hub-heading-content">
          <div>
            <p className="section-index">TASK 2 / PARTICIPANT HUB</p>
            <h1>Market-Neutral Hedging training data</h1>
            <p>
              Training data for Task 2 is available from HERCULEAN on Hugging Face.
              Download prices, news, and corporate filings below to prepare your system.
            </p>
          </div>
          <dl className="task-hub-facts" aria-label="Task 2 quick facts">
            <div><dt>Status</dt><dd>Training data available</dd></div>
            <div><dt>Format</dt><dd>3 Parquet files</dd></div>
            <div><dt>Submission</dt><dd>Publication pending</dd></div>
          </dl>
        </div>
      </header>

      <section className="task-platform-card" aria-labelledby="task2-downloads-title">
        <div className="task-platform-copy">
          <div>
            <p className="section-index">DOWNLOADS</p>
            <h2 id="task2-downloads-title">Task 2 files</h2>
          </div>
          <p>
            These links download the training files directly from the
            HERCULEAN dataset. You can also browse the full{" "}
            <a href={`${datasetUrl}/tree/main/data`}>data directory on Hugging Face</a>.
          </p>
        </div>
        <div className="task-mode-grid">
          <article>
            <span>TRAINING / 3 FILES</span>
            <ul className="policy-list">
              {trainingFiles.map((file) => (
                <li key={file}>
                  <a href={`${datasetUrl}/resolve/main/data/${file}?download=true`}>{file}</a>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <p className="task-platform-footnote">
          Data source and license: <a href={datasetUrl}>HERCULEAN dataset card</a> (CC BY 4.0).
        </p>
      </section>

      <aside className="task-hub-note">
        <strong>Evaluation and submission status</strong>
        <p>
          Development and private evaluation splits, exact market windows, eligible assets,
          execution assumptions, transaction costs, position-validity rules, and the scorer
          will be published separately. The Task 2 submission route is not yet open.
        </p>
      </aside>
    </main>
  );
}
