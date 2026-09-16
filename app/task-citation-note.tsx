import Link from "next/link";

export function TaskCitationNote({ task }: { task: 1 | 2 | 3 }) {
  return (
    <aside className="task-hub-note">
      <strong>Required citations for Working Notes</strong>
      <p>
        Cite the FinReason Cup overview and the Task {task} overview in your Working Notes.
        {task === 1 && " Also cite the FinChain benchmark paper."}
        {" "}If you participate in other tasks, include their overviews as well.
        {" "}<Link href="/#paper-references">Copy or download the required BibTeX</Link>.
        {" "}Overview author lists are currently Pending; refresh the entries before your final paper submission.
      </p>
    </aside>
  );
}
