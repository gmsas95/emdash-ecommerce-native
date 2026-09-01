import { Badge, Button } from "@cloudflare/kumo";
import type { ReactNode } from "react";

interface Props {
  message: string;
  status?: "info" | "success" | "error";
  action?: ReactNode;
}

export function CommerceStatus({ message, status = "info", action }: Props) {
  const badgeVariant = status === "error" ? "destructive" : status === "success" ? "success" : "secondary";
  return (
    <div className="commerce-status" data-status={status} role={status === "error" ? "alert" : "status"}>
      <Badge variant={badgeVariant}>{status === "success" ? "Ready" : status === "error" ? "Action needed" : "Info"}</Badge>
      <span>{message}</span>
      {action && <span className="commerce-status__action">{action}</span>}
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return <Button type="button" variant="outline" onClick={onClick}>Retry</Button>;
}
