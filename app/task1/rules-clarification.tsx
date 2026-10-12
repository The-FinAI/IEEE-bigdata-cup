export function Task1RulesClarification() {
  return (
    <section className="task-hub-note" id="task1-rules-clarification" aria-labelledby="task1-rules-title">
      <h2 id="task1-rules-title">Task 1 rules clarification · 12 October 2026</h2>
      <h3>Final ranking and ties</h3>
      <p>The frozen scorer is finreason.task1.scorer/2.0.0. Final ranking uses descending lexicographic order of (CombinedFAC, HiddenFAC, CombinedCheckpoint), with each key quantized to six decimal places using round-half-even. CombinedFAC and CombinedCheckpoint each weight the seen and hidden strata within the Test evaluation equally; they do not average development leaderboard scores with Test scores. Teams identical on all three keys share the same rank. Submission time is not an additional tie-breaker.</p>
      <h3>Use of public FinChain templates</h3>
      <p>Subject to the resource licence, teams may generate additional training, few-shot or local evaluation data from public FinChain templates, use those templates to categorize questions for analysis, and match questions to public templates to compute predictions. Computing predictions with a public symbolic template is permitted. Describe the FinChain version, matching and execution procedure, and contribution to predictions in the Working Notes. Accessing private evaluation answers, bypassing submission limits or exploiting the evaluation service is prohibited.</p>
      <h3>Development submission limit</h3>
      <p>Each normalized Team Name may make two accepted submissions per UTC day and 40 accepted submissions in total. The daily window resets at 00:00 UTC. Rejected uploads and identical re-uploads of an accepted ZIP do not consume another submission. Keep one consistent Team Name. Test submissions remain unlimited before the deadline.</p>
      <h3>Restoring earlier Test predictions</h3>
      <p>To restore earlier predictions, generate a new valid ZIP containing that earlier predictions.jsonl and upload it under the same Team Name and Contact Email before the deadline. The new ZIP must differ from the previously accepted archive and receive a new acceptance receipt; its prediction contents may remain unchanged. If the portal returns the original receipt and acceptance time, the upload is a replay and the latest submission has not changed. The latest accepted, valid submission before the deadline is used for final evaluation.</p>
      <h3>Organizer model baselines</h3>
      <p>Lite, Standard and Advanced are model-based references evaluated on the same 580 development questions with the frozen scorer. They generate final-answer and checkpoint predictions from public questions without gold-answer inputs. Their Final answer / Reasoning steps scores are Lite 0.234048 / 0.555354, Standard 0.980556 / 0.987725, and Advanced 0.984444 / 0.990000. Model identities and full configurations are not currently public. Cite the published baseline labels and development leaderboard. Publication of Test scores for these three systems has not been confirmed.</p>
    </section>
  );
}
