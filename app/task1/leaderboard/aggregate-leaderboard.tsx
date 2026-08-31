"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  fetchDevelopmentLeaderboard,
  type DevelopmentLeaderboard,
} from "@/lib/task1-leaderboard.mjs";

type LoadState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "ready"; leaderboard: DevelopmentLeaderboard }
  | { status: "error" };

type AggregateLeaderboardProps = {
  dataUrl: string | null;
};

function formatAcceptedAt(value: string) {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function AggregateLeaderboard({ dataUrl }: AggregateLeaderboardProps) {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<LoadState>(() =>
    dataUrl ? { status: "loading" } : { status: "unconfigured" },
  );

  useEffect(() => {
    if (!dataUrl) {
      setState({ status: "unconfigured" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    async function load() {
      try {
        const leaderboard = await fetchDevelopmentLeaderboard(dataUrl as string, {
          signal: controller.signal,
        });
        setState({ status: "ready", leaderboard });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, [dataUrl, requestVersion]);

  const statusMessage =
    state.status === "unconfigured"
      ? "The optional public aggregate leaderboard is not enabled."
      : state.status === "loading"
        ? "Loading the latest aggregate development leaderboard."
        : state.status === "error"
          ? "The aggregate development leaderboard is temporarily unavailable."
          : `Loaded ${state.leaderboard.rows.length} development leaderboard rows.`;

  let content: ReactNode;

  if (state.status === "unconfigured") {
    content = (
      <div className="leaderboard-state" data-state="pending">
        <strong>Public aggregate table not enabled</strong>
        <p>
          Registered teams can use their organizer-issued private access code in the Task 1 Space.
          This Pages build does not substitute pilot or cached results when the optional public feed
          is absent.
        </p>
      </div>
    );
  } else if (state.status === "loading") {
    content = (
      <div className="leaderboard-state" data-state="loading">
        <strong>Loading development results</strong>
        <p>Requesting the latest aggregate leaderboard from the organizer endpoint.</p>
      </div>
    );
  } else if (state.status === "error") {
    content = (
      <div className="leaderboard-state" data-state="error">
        <strong>Leaderboard temporarily unavailable</strong>
        <p>
          The configured aggregate feed could not be read. No previous or pilot result is substituted.
        </p>
        <button
          className="leaderboard-retry"
          type="button"
          onClick={() => setRequestVersion((version) => version + 1)}
        >
          Try again
        </button>
      </div>
    );
  } else {
    const { leaderboard } = state;
    content = (
      <>
        <div className="leaderboard-heading">
          <div>
            <span>Evaluation</span>
            <strong id="development-table-title">Task 1 development</strong>
          </div>
          <p>Best accepted development result per team</p>
        </div>

        {leaderboard.rows.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-labelledby="development-table-title"
            tabIndex={0}
          >
            <table aria-labelledby="development-table-title">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th scope="col">SeenFAC</th>
                  <th scope="col">SeenCheckpoint</th>
                  <th scope="col">Accepted</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.rows.map((row) => (
                  <tr key={row.teamId}>
                    <td>{row.rank}</td>
                    <th scope="row">{row.teamDisplayName}</th>
                    <td>{row.seenFac}</td>
                    <td>{row.seenCheckpoint}</td>
                    <td>{formatAcceptedAt(row.acceptedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="leaderboard-empty">
            The development feed is live, but it does not contain any eligible rows yet.
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>
      <div aria-busy={state.status === "loading"}>{content}</div>
    </>
  );
}
