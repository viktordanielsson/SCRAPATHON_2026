import { createFileRoute } from "@tanstack/react-router";

import { ConsoleShell } from "@/components/callguard/ConsoleShell";
import { RecentThreats } from "@/components/callguard/RecentThreats";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "CallGuard — Recent calls" },
      {
        name: "description",
        content:
          "Replay recorded calls and the social-engineering risk that drove each one.",
      },
    ],
  }),
  component: CallsPage,
});

/**
 * Recent calls — the operator's call history. Every analyzed call is recorded
 * (event-sourced) to the history store and replayed here through the live
 * reducer. The list + detail view live in <RecentThreats/>; this route just
 * frames it in the console chrome and links from the sidebar.
 */
function CallsPage() {
  return (
    <ConsoleShell title="Recent calls" subtitle="History">
      <div className="flex-1 p-6">
        <div className="mx-auto w-full max-w-3xl">
          <RecentThreats />
        </div>
      </div>
    </ConsoleShell>
  );
}
