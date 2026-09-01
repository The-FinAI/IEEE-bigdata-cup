import type { Metadata } from "next";
import Link from "next/link";

const contactEmail = "zhuohan.xie@mbzuai.ac.ae";
const pageUrl = "https://the-finai.github.io/IEEE-bigdata-cup/privacy/";
const pageDescription =
  "Privacy notice for the FinReason Cup organizer website, Letter of Intent, and participant services.";

export const metadata: Metadata = {
  title: "Privacy Notice | FinReason Cup",
  description: pageDescription,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Privacy Notice | FinReason Cup",
    description: pageDescription,
    siteName: "FinReason Cup",
    type: "website",
    url: pageUrl,
    images: [
      {
        url: "https://the-finai.github.io/IEEE-bigdata-cup/og.jpg",
        width: 1200,
        height: 630,
        alt: "FinReason Cup 2026 participant information",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Notice | FinReason Cup",
    description: pageDescription,
    images: ["https://the-finai.github.io/IEEE-bigdata-cup/og.jpg"],
  },
};

export default function PrivacyPage() {
  return (
    <main className="task-hub-page policy-page">
      <nav className="task-hub-nav" aria-label="Policy navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/terms/">Terms of Participation</Link>
      </nav>

      <header className="task-hub-heading policy-heading">
        <p className="section-index">PARTICIPANT INFORMATION / PRIVACY</p>
        <h1>Privacy Notice.</h1>
        <p>
          This notice explains how the FinReason Cup organizer team uses
          information provided through the Letter of Intent and
          organizer-operated participant services.
        </p>
        <dl className="policy-meta">
          <div>
            <dt>Effective</dt>
            <dd>1 September 2026</dd>
          </div>
          <div>
            <dt>Privacy contact</dt>
            <dd>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="policy-content">
        <section className="policy-section" aria-labelledby="privacy-scope">
          <p className="section-index">01 / SCOPE</p>
          <h2 id="privacy-scope">What this notice covers</h2>
          <p>
            This notice covers information provided directly to the FinReason
            Cup organizer team through the Letter of Intent and
            organizer-operated participant services. It also describes the
            public result fields the organizers may publish. External services,
            including Google Forms, CyberChair, Hugging Face, GitHub, and the
            conference website, may apply their own privacy notices and terms.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-data">
          <p className="section-index">02 / INFORMATION</p>
          <h2 id="privacy-data">Information processed</h2>
          <ul className="policy-list">
            <li>
              Letter of Intent information, such as team contact details,
              affiliation, task interests, and other information entered by the
              submitter.
            </li>
            <li>
              Team registration records, including team and member details,
              contact addresses, team status, and organizer-issued access
              records.
            </li>
            <li>
              Task 1 submission records, including team and submission
              identifiers, submitted prediction archives, validation records,
              aggregate development scores, receipt information, and event
              times.
            </li>
            <li>
              Support messages and the information needed to investigate a
              correction, appeal, integrity issue, or service incident.
            </li>
          </ul>
          <p>
            Please do not provide sensitive personal information that is not
            required for challenge participation.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-purpose">
          <p className="section-index">03 / PURPOSE</p>
          <h2 id="privacy-purpose">Why information is used</h2>
          <p>
            The organizer team uses the information for challenge planning,
            participant communication permitted by the relevant form,
            registration and team administration, submission authentication and
            validation, scoring, quota and replay enforcement, leaderboard and
            result administration, support, integrity review, and aggregate
            participation reporting.
          </p>
          <p>
            The organizers do not sell participant information or use it for
            targeted advertising.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-pages">
          <p className="section-index">04 / PUBLIC SITE</p>
          <h2 id="privacy-pages">GitHub Pages boundary</h2>
          <p>
            The public GitHub Pages website does not collect or store team
            access codes, submission files, gold answers, or private evaluation
            data. Access codes and competition files are entered only in the
            separate verified participant service linked from the Task 1 hub.
          </p>
          <p>
            The public site may receive ordinary technical requests handled by
            GitHub Pages. Refer to GitHub&apos;s own privacy documentation for its
            platform processing.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-public">
          <p className="section-index">05 / VISIBILITY</p>
          <h2 id="privacy-public">What may be public</h2>
          <p>
            The optional public development leaderboard may display a team
            identifier, team display name, submission identifier, rank,
            aggregate SeenFAC and SeenCheckpoint scores, and acceptance time.
            Raw submissions, access codes, email addresses, hidden evaluation
            data, and private receipts are not published through that
            leaderboard. Test submissions do not produce an online score, rank,
            or leaderboard entry.
          </p>
          <p>
            Final team names, rankings, award results, papers, citations, and
            aggregate competition statistics may remain public as part of the
            challenge record.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-security">
          <p className="section-index">06 / SECURITY</p>
          <h2 id="privacy-security">Submission handling</h2>
          <p>
            Task 1 participant services are designed to separate public
            resources from organizer-private submissions and evaluation data.
            Accepted submission archives are encrypted before storage in the
            organizer-private submission boundary. Access is limited to the
            organizer functions needed to operate, evaluate, support, and audit
            the challenge.
          </p>
          <p>
            No online service can guarantee absolute security. Participants
            should not include credentials, personal data, or unrelated files
            in a competition submission.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-retention">
          <p className="section-index">07 / RETENTION</p>
          <h2 id="privacy-retention">How long records are kept</h2>
          <p>
            Private Task 1 submission archives and non-public operational event
            records are retained for up to 120 days from acceptance. A record
            may be kept longer when needed to resolve an active appeal,
            integrity review, security incident, or applicable institutional or
            legal requirement. Public leaderboard and final result records,
            papers, citations, and aggregate statistics may remain available as
            part of the challenge record.
          </p>
          <p>
            Letter of Intent and registration contact records are kept while
            needed to operate the current competition and handle follow-up
            questions, then deleted or minimized when they are no longer needed,
            subject to the exceptions above.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-services">
          <p className="section-index">08 / EXTERNAL SERVICES</p>
          <h2 id="privacy-services">Where information may be processed</h2>
          <p>
            The challenge uses external services for specific functions,
            including Google Forms for the Letter of Intent, CyberChair for
            challenge papers, GitHub Pages for the public website, and Hugging
            Face for verified participant services. Information submitted to an
            external service may also be processed under that service&apos;s terms,
            privacy notice, account settings, and infrastructure practices.
          </p>
        </section>

        <section className="policy-section policy-contact" aria-labelledby="privacy-requests">
          <p className="section-index">09 / REQUESTS</p>
          <h2 id="privacy-requests">Correction and deletion requests</h2>
          <p>
            To ask a privacy question or request access, correction, or deletion
            of information provided directly to the organizer team, email{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Include enough
            information to identify the relevant team and record, but do not
            send an access code or submission archive by email.
          </p>
          <p>
            A request may be limited when a record is needed for result
            integrity, an unresolved dispute, security, or an applicable
            obligation. Requests concerning information held solely by an
            external platform may also need to be directed to that platform.
          </p>
          <p>
            See the <Link href="/terms/">Terms of Participation</Link> for the
            competition routes and evaluation rules.
          </p>
        </section>
      </div>
    </main>
  );
}
