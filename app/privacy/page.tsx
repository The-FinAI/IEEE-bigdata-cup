import type { Metadata } from "next";
import Link from "next/link";

const contactEmail = "zhuohan.xie@mbzuai.ac.ae";
const pageUrl = "https://the-finai.github.io/IEEE-bigdata-cup/privacy/";
const pageDescription =
  "Privacy notice for the FinReason Cup organizer website and participant services.";

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
          information provided through organizer-operated participant services.
        </p>
        <dl className="policy-meta">
          <div>
            <dt>Effective</dt>
            <dd>29 October 2026</dd>
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
            Cup organizer team through organizer-operated participant services.
            It also describes the public result fields the organizers may
            publish. External services, including CyberChair, Hugging Face,
            GitHub, and the conference website, may apply their own privacy
            notices and terms.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-data">
          <p className="section-index">02 / INFORMATION</p>
          <h2 id="privacy-data">Information processed</h2>
          <ul className="policy-list">
            <li>
              Development submission records, including Team Name, submitted
              prediction archive, validation record, aggregate scores, receipt
              information, and event times. Team Name is the only
              participant-provided identity or contact field for development prediction uploads.
            </li>
            <li>
              Optional participant contact registrations, available separately
              from prediction uploads from 29 October 2026. These include Team
              Name, contact email, phase, a matching submission reference,
              registration time, and agreement to receive Working Notes reminders
              and competition administration messages. The email and team details
              are encrypted before storage in organizer-private repositories.
              Test registrations are matched against the original email-derived
              identifier and Team Name. Development registrations match a team
              and receipt and are self-declared contacts; they do not verify email ownership.
            </li>
            <li>
              Test submission records, including Team Name, Contact Email,
              submitted prediction archive, validation and receipt records, and
              event times. Contact Email is collected only for submission
              identification, submission-related support, matching final
              results to the related challenge paper, and selecting the latest accepted test
              submission and handling repeat uploads through a non-public
              pseudonymous identifier.
            </li>
            <li>
              Support messages and the information needed to investigate a
              correction, appeal, integrity issue, or service incident.
            </li>
            <li>
              Legacy interest-form and access-registration records collected or
              created before 3 September 2026, if any. These records are no
              longer used to control Task 1 submission access.
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
            The organizer team uses submission records for validation,
            development scoring, development quota enforcement and repeat-upload handling, leaderboard and
            result administration, integrity review, and aggregate participation
            reporting. Contact Email is used only for submission identification,
            submission-related support, matching final results to the related
            challenge paper, and selecting the latest accepted test submission and handling repeat
            uploads through a non-public pseudonymous identifier.
          </p>
          <p>
            Contact details saved through the optional reminder form are used
            for Working Notes deadline reminders, result and paper matching,
            and direct competition administration. Saving a contact is voluntary
            and does not change accepted submissions, scores, or submission deadlines.
          </p>
          <p>
            Legacy interest-form and access-registration records are used only
            for transition support, record consistency, and handling related
            participant requests. They are not used to require approval or a
            code for Task 1 participation.
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
            The public GitHub Pages website does not collect or store Contact
            Email, submission files, gold answers, or private evaluation data.
            Team Name and competition files are entered only in the separate
            verified participant services linked from the Task 1 hub. Contact
            Email is entered on the verified test submission page or on the
            separate optional reminder form in either Task 1 portal.
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
            The public development leaderboard may display Team Name, rank,
            aggregate final-answer and reasoning-step scores, and acceptance
            time. Raw submissions, Contact Email, private identifiers, hidden
            evaluation data, and receipts are never published through that
            leaderboard. Test submissions do not produce an online score, rank,
            diagnostic, score-derived signal, or leaderboard entry.
          </p>
          <p>
            Final team names, rankings, award results, papers, citations, and
            aggregate competition statistics may remain public as part of the
            challenge record. Contact Email is never published or included in a
            public result or challenge record.
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
            Original Test prediction uploads used the email in memory to derive
            a private pseudonymous identifier; those records do not retain a
            recoverable email. Original Development prediction uploads did not
            collect email. From 29 October 2026, participants can separately save
            a contact email for reminders. These optional contact records are
            encrypted at rest and can be read only using organizer-held keys.
            They are retained only while needed for Working Notes, results,
            related competition administration, and participant requests, subject
            to the repository-history limits below. A private pseudonymous
            identifier may remain for submission-version selection and repeat uploads.
          </p>
          <p>
            Encrypted submission archives, optional contact records, and non-public operational event
            records may remain in restricted organizer-private repository
            history for challenge administration, integrity review, audit,
            dispute resolution, security, and applicable institutional or legal
            requirements. They are not published, and retained fields and
            access are minimized when the records are no longer operationally
            needed. Because repository history may preserve prior encrypted
            records, the organizers do not promise deletion of every historical
            copy within a fixed period.
          </p>
          <p>
            Legacy interest-form and access-registration records are kept only
            while needed to operate the current competition and handle related
            follow-up, then deleted or minimized, subject to the integrity,
            dispute-resolution, security, institutional, and legal purposes
            stated above.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="privacy-services">
          <p className="section-index">08 / EXTERNAL SERVICES</p>
          <h2 id="privacy-services">Where information may be processed</h2>
          <p>
            The challenge uses external services for specific functions,
            including CyberChair for challenge papers, GitHub Pages for the
            public website, and Hugging Face for verified participant services.
            Information submitted to an
            external service may also be processed under that service&apos;s terms,
            privacy notice, account settings, and infrastructure practices.
          </p>
          <p>
            Before 3 September 2026, the organizers also used a Google Forms
            interest form. That form is no longer a participation or submission
            route, but Google may continue to process prior responses under its
            own privacy notice and account settings.
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
            send a submission archive by email.
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
