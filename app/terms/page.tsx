import type { Metadata } from "next";
import Link from "next/link";

const contactEmail = "zhuohan.xie@mbzuai.ac.ae";
const pageUrl = "https://the-finai.github.io/IEEE-bigdata-cup/terms/";
const pageDescription =
  "Organizer-maintained participation terms for the FinReason Cup at IEEE Big Data 2026.";

export const metadata: Metadata = {
  title: "Terms of Participation | FinReason Cup",
  description: pageDescription,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Terms of Participation | FinReason Cup",
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
    title: "Terms of Participation | FinReason Cup",
    description: pageDescription,
    images: ["https://the-finai.github.io/IEEE-bigdata-cup/og.jpg"],
  },
};

export default function TermsPage() {
  return (
    <main className="task-hub-page policy-page">
      <nav className="task-hub-nav" aria-label="Policy navigation">
        <Link href="/">FinReason Cup</Link>
        <Link href="/privacy/">Privacy notice</Link>
      </nav>

      <header className="task-hub-heading policy-heading">
        <p className="section-index">PARTICIPANT INFORMATION / TERMS</p>
        <h1>Terms of Participation.</h1>
        <p>
          These organizer-maintained terms describe the current participation,
          submission, evaluation, and publication routes for FinReason Cup.
        </p>
        <dl className="policy-meta">
          <div>
            <dt>Effective</dt>
            <dd>2 September 2026</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="policy-content">
        <section className="policy-section" aria-labelledby="terms-scope">
          <p className="section-index">01 / SCOPE</p>
          <h2 id="terms-scope">About these terms</h2>
          <p>
            These terms apply to the organizer-maintained FinReason Cup website
            and participant services operated for the challenge. FinReason Cup
            is listed as Challenge 03 of the IEEE Big Data Cup 2026. The
            organizer team is led by The Fin AI, with contributors affiliated
            with several universities. Those affiliations do not imply
            institutional sponsorship. These terms do not state that IEEE or an
            affiliated university authored or legally endorsed them.
          </p>
          <p>
            By using an organizer-issued access code or submitting competition
            materials, a team agrees to these terms and the task-specific rules
            published with the applicable verified release.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-routes">
          <p className="section-index">02 / OFFICIAL ROUTES</p>
          <h2 id="terms-routes">Use the route assigned to each item</h2>
          <ul className="policy-list">
            <li>
              Submit one Letter of Intent per team through the verified Google
              Forms link on the challenge website.
            </li>
            <li>
              Submit the challenge paper through the FinReason Cup SC03 track in
              CyberChair.
            </li>
            <li>
              Submit Task 1 competition files only through the verified
              development or test service linked from the Task 1 participant
              hub.
            </li>
          </ul>
          <p>
            Teams must keep organizer-issued access codes confidential and must
            not share or publish them. The participant hub publishes service
            links only after organizer deployment checks and records their
            current verified availability.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-conduct">
          <p className="section-index">03 / PARTICIPATION</p>
          <h2 id="terms-conduct">Team and submission conduct</h2>
          <p>
            Teams must provide accurate registration information, use one team
            identity unless the organizers approve a change, and submit only
            materials they are permitted to use. Submissions must follow the
            published schema and must not contain malware, credentials, hidden
            network calls, or material intended to access private evaluation
            data or disrupt the service.
          </p>
          <p>
            Attempts to obtain hidden answers, bypass access controls, evade
            submission limits, impersonate another team, or interfere with
            evaluation integrity may be rejected or removed from ranking. The
            organizers will document any material enforcement decision and give
            the affected team a contact route.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-evaluation">
          <p className="section-index">04 / EVALUATION</p>
          <h2 id="terms-evaluation">Task 1 scores and results</h2>
          <p>
            Public training materials may be used as described in their release
            documentation. Accepted development submissions return aggregate
            SeenFAC and SeenCheckpoint results and may enter the development
            leaderboard. Accepted test submissions return an acceptance receipt
            only. They do not receive an online score or rank and do not appear
            on an online test leaderboard. The organizers perform official test
            evaluation after submissions close.
          </p>
          <p>
            Development scores are feedback for the active development phase.
            Official results are determined from the frozen task contract,
            eligible submission, and organizer evaluation record. The organizers
            may correct a demonstrable technical or scoring error and will
            disclose a material correction that changes published results.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-public-results">
          <p className="section-index">05 / PUBLIC RESULTS</p>
          <h2 id="terms-public-results">Leaderboard visibility</h2>
          <p>
            Eligible development results may appear on an authenticated
            leaderboard and, if enabled, an aggregate public leaderboard. Public
            fields may include a team identifier, team display name, submission
            identifier, rank, aggregate scores, and acceptance time. Raw
            submissions, access codes, email addresses, hidden evaluation data,
            and private evaluation receipts are not public leaderboard fields.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-paper">
          <p className="section-index">06 / PAPER</p>
          <h2 id="terms-paper">Challenge paper and publication</h2>
          <p>
            Teams seeking final ranking and awards must submit a challenge paper
            of up to 6 pages total, including references, in the IEEE two-column
            conference format by 15 November 2026, 23:59 Anywhere on Earth.
            Submission does not guarantee publication. Publication remains
            subject to conference peer review, acceptance, camera-ready
            submission, registration, and presentation requirements.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-rights">
          <p className="section-index">07 / RIGHTS</p>
          <h2 id="terms-rights">Resources and participant materials</h2>
          <p>
            Each released dataset, code package, or other resource is governed
            only by the license published with that resource. These terms do not
            create a license for a resource that does not include one.
          </p>
          <p>
            Participants retain their rights in their papers, code, models, and
            submission files. Participants permit the organizers to receive,
            validate, securely store, reproduce, and evaluate submitted
            materials as needed to operate the challenge, investigate integrity
            issues, and produce results. The organizers will not publish raw
            submission files or participant source code unless the applicable
            rules state that publication is required or the team separately
            authorizes it.
          </p>
        </section>

        <section className="policy-section" aria-labelledby="terms-services">
          <p className="section-index">08 / SERVICES</p>
          <h2 id="terms-services">External platforms and rule updates</h2>
          <p>
            Google Forms, CyberChair, GitHub, Hugging Face, and the conference
            website, and other external services may apply their own terms and
            privacy notices. The organizers may update technical rules, dates,
            or service routes when needed for a secure and fair competition.
            Material changes will be dated and published on the
            organizer-maintained website before they apply whenever practical.
          </p>
          <p>
            No FinReason cash prize or registration support is confirmed at this
            time. Award categories remain provisional until the organizers
            publish them.
          </p>
        </section>

        <section className="policy-section policy-contact" aria-labelledby="terms-contact">
          <p className="section-index">09 / CONTACT</p>
          <h2 id="terms-contact">Questions about participation</h2>
          <p>
            Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Include
            the team name and task number when the question concerns a specific
            registration or submission.
          </p>
          <p>
            See the <Link href="/privacy/">Privacy Notice</Link> for information
            about competition records and correction or deletion requests.
          </p>
        </section>
      </div>
    </main>
  );
}
