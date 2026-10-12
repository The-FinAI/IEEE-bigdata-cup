export function TestSubmissionPolicy() {
  return (
    <aside className="task-hub-note" id="test-resubmissions">
      <strong>Test resubmissions: unlimited before the deadline</strong>
      <p>
        You may submit revised Test predictions as often as needed before 15 October 2026,
        23:59 Anywhere on Earth. There is no daily or total Test submission quota.
        Keep the same Team Name and Contact Email for all revisions.
      </p>
      <p>
        Your latest accepted, valid submission before the deadline replaces earlier accepted
        submissions for final evaluation. An invalid or rejected upload does not replace your
        last accepted submission. Save each acceptance receipt.
      </p>
      <p>
        Uploading an identical previously accepted file returns its original receipt and acceptance
        time; it does not create a new revision or change which submission is latest.
        Earlier records are retained privately for the competition audit trail.
        Test scores and ranks remain hidden until final results.
      </p>
      <p>
        To restore earlier predictions, generate a new valid ZIP containing the earlier predictions.jsonl
        and upload it with the same Team Name and Contact Email before the deadline. The ZIP must differ
        from the previous archive and receive a new acceptance receipt; the predictions may stay unchanged.
        A replay returning the original receipt does not restore the earlier version.
        Restoration clarification published 12 October 2026.
      </p>
      <p>Policy updated 16 September 2026, replacing the previous Test submission-count limits.</p>
    </aside>
  );
}
