import Link from "next/link";

export function PaperReminder() {
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
        Save a private contact for paper reminders on the{" "}
        <a href="https://zhuohan-finreason-task1-test-submission.hf.space/">Test portal</a> or{" "}
        <a href="https://zhuohan-finreason-task1-development.hf.space/">Development portal</a>.{" "}
        <Link href="/privacy/">Contact privacy notice</Link>
      </p>
    </aside>
  );
}
