import Link from "next/link";
import { getTask1PublicConfig } from "./task1/public-config";

export function PaperReminder() {
  const config = getTask1PublicConfig();
  const contactsReady = config.siteMode === "final" && config.testSpace.state === "ready" &&
    config.developmentSpace.state === "ready" && config.testSpace.url && config.developmentSpace.url;
  return (
    <aside className="paper-reminder" aria-label="Working Notes deadline reminder">
      <p>
        <strong>Submitted a system? Working Notes are due 2 November 2026, 23:59 AoE.</strong>{" "}
        Submit through{" "}
        <a href="https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03">CyberChair SC03</a>.{" "}
        <Link href="/#interest">Paper instructions</Link> · <Link href="/#paper-references">BibTeX</Link>
      </p>
      <p>
        Task 1 teams: earlier submission records do not contain a recoverable email address.
        {contactsReady ? <> Save a private contact for paper reminders on the{" "}
          <a href={config.testSpace.url!}>Test portal</a> or{" "}
          <a href={config.developmentSpace.url!}>Development portal</a>. </> :
          <> Contact <a href="mailto:zhuohan.xie@mbzuai.ac.ae">the organizers</a> with your Team Name for paper reminders. </>}
        <Link href="/privacy/">Contact privacy notice</Link>
      </p>
    </aside>
  );
}
