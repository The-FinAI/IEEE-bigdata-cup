const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="section-index">404 / NOT FOUND</p>
      <h1>This path is not part of the challenge site.</h1>
      <p>
        Return to the FinReason Cup overview for verified participant links and
        updates.
      </p>
      <a className="button button-bright" href={`${basePath}/`}>
        Return to FinReason Cup
      </a>
    </main>
  );
}
