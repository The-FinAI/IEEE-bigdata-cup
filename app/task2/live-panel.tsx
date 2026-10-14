import snapshot from "./live-state.json";
import { releaseSchedule, formatNewYork } from "./live-schedule";
const dataset = "https://huggingface.co/datasets/CarolynJiang/Market-Neutral-Hedging-live-trading";
const space = "https://huggingface.co/spaces/CarolynJiang/market-neutral-hedging-leaderboard";
type Row = { team_name: string; cumulative_return: number; is_baseline: boolean };
type Release = { round_id: string; published_at: string; price_url: string; news_url: string };
type ReleaseTask = {round_id: string; status: "scheduled" | "pending" | "failed" | "published"; message: string};
export function LivePanel() {
  const releases = new Map((snapshot.releases as Release[]).map(r=>[r.round_id,r]));
  const tasks = new Map((snapshot.release_tasks as ReleaseTask[]).map(r=>[r.round_id,r]));
  const rows = (snapshot.rows as Row[]).slice().sort((a,b)=>b.cumulative_return-a.cumulative_return || a.team_name.localeCompare(b.team_name));
  let lastReturn: number | null = null, rank = 0;
  return <section className="task-platform-card task2-live-panel" aria-labelledby="task2-live-title">
    <div className="task-platform-copy"><div><p className="section-index">LIVE TEST / 14 SCHEDULED WEBSITE UPDATES</p><h2 id="task2-live-title">Market-neutral decisions.<br/>Measured round by round.</h2></div><p>Select two stocks, choose LS, SL, or F, and compare cumulative returns with the Codex baseline. All schedule times are in New York.</p></div>
    <div className="task-mode-grid"><article><span>FIRST ACTION DEADLINE</span><h3>14 Oct · 10:25</h3></article><article><span>FINAL ACTION DEADLINE</span><h3>16 Oct · 08:00</h3></article><article><span>FINAL RESULTS</span><h3>16 Oct · 10:30</h3></article></div>
    <p className="task-platform-footnote">Published website snapshot: {snapshot.updated_at ?? "not yet updated"}. Event {snapshot.event} of 14. This page displays a locally verified snapshot, not continuous live API results.</p>
    <h3>Data releases</h3><p>One price row and one English, 30–50-token news summary per ticker. Releases 1–12 are published only on the data Dataset; coverage and missing-price flags are retained.</p><p>{snapshot.data_status}</p><p><a className="task-live-link" href={dataset}>Open released data on Hugging Face ↗</a></p>
    <div style={{overflowX:"auto"}}><table aria-label="Data publication task status"><caption>All 12 data releases — status as of the same scheduled snapshot as the CR ranking</caption><thead><tr><th scope="col">Round</th><th scope="col">New York release</th><th scope="col">News window</th><th scope="col">Action due</th><th scope="col">Publication status</th><th scope="col">Files</th></tr></thead><tbody>{releaseSchedule.map(r=>{
      const release=releases.get(r.round_id),task=tasks.get(r.round_id);
      const status=release ? "published" : task?.status ?? (r.round<=Math.min(snapshot.event,12) ? "pending" : "scheduled");
      const labels={scheduled:"Scheduled",pending:"Pending",failed:"Failed",published:"Published"};
      return <tr key={r.round_id}><th scope="row">{r.round}</th><td style={{whiteSpace:"nowrap"}}>{formatNewYork(r.release)}</td><td>{formatNewYork(r.window_start)} → {formatNewYork(r.release)}</td><td style={{whiteSpace:"nowrap"}}>{formatNewYork(r.deadline)}</td><td><strong>{labels[status]}</strong>{task?.message && <div className="task-platform-footnote">{task.message}</div>}{release && <div className="task-platform-footnote">Published: {formatNewYork(release.published_at)}</div>}</td><td>{release ? <><a href={release.price_url}>price.parquet</a><br/><a href={release.news_url}>news.parquet</a></> : "Not published"}</td></tr>;
    })}</tbody></table></div>
    <p className="task-platform-footnote">Scheduled: not yet due. Pending: due but no confirmed publication. Failed: collection or upload did not complete. Published: both files were committed to the Dataset; coverage and missing-price flags still apply. News windows include their start and exclude their end. Events 13–14 update this table and CR ranking, but publish no additional data batch.</p>
    <h3>Submit a pair action</h3><p>The submission service collects Team Name, Stock 1, Stock 2, and Action privately once it is available. Two distinct stocks are required, and each team may submit only once per round. The public static Space displays submission metadata only: team, round, receipt time, and acceptance status. Submitted stocks and actions are administrator-only and are never included in public files.</p><p>{snapshot.submission_status}</p><p><a className="task-live-link" href={space}>Open public submission records on Hugging Face ↗</a></p>
    <h3>{snapshot.final ? "Final CR ranking" : "Cumulative-return (CR) ranking"}</h3><p>Ranks are updated at events 2–14. Team and baseline stock selections and actions remain private. The Codex baseline is a reference and is excluded from participant prizes.</p><p>{snapshot.ranking_status}</p>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>CR rank</th><th>Team / reference</th><th>Cumulative return</th></tr></thead><tbody>{rows.length ? rows.map((r,i)=>{if(lastReturn!==r.cumulative_return)rank=i+1;lastReturn=r.cumulative_return;return <tr key={r.team_name}><td>{rank}</td><td>{r.team_name}{r.is_baseline ? " · Codex reference" : ""}</td><td>{(100*r.cumulative_return).toFixed(2)}%</td></tr>;}) : <tr><td colSpan={3}>No verified team or baseline returns have been published.</td></tr>}</tbody></table></div>
    <h3>Final cumulative-return paths</h3>{snapshot.final && snapshot.chart ? <img src={snapshot.chart} alt="Verified cumulative-return curves for teams and Codex baseline over twelve decision rounds" style={{width:"100%",height:"auto"}}/> : <p>The final chart is published at event 14, 16 October 10:30, after verified terminal settlement. No illustrative performance is presented as real results.</p>}
  </section>;
}
