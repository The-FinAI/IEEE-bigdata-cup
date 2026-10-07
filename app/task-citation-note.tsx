import Link from "next/link";

export function TaskCitationNote({ task }: { task: 1 | 2 | 3 }) {
  return (
    <aside className="task-hub-note">
      <strong>Required citations for Working Notes</strong>
      <p>
        Cite the FinReason Cup overview and the Task {task} overview in your Working Notes.
        {task === 1 && " Also cite the FinChain benchmark paper."}
        {task === 2 && " Also cite the Herculean benchmark paper."}
        {task === 3 && " Also cite the Herculean and FinAuditing benchmark papers."}
        {" "}If you participate in other tasks, include their overviews as well.
        {" "}<Link href="/#paper-references">Copy or download the required BibTeX</Link>.
        {" "}Cup and Task 1 author lists are provided; Task 2 and Task 3 authors await confirmation. Refresh the entries before your final paper submission.
      </p>
    </aside>
  );
}
