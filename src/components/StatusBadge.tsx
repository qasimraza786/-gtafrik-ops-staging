type Status = "INSTALLED" | "READY TO DEPLOY" | "PAIRED" | "DAMAGED" | "LOST" | "UNINSTALLED" | "Available";

type StatusBadgeProps = {
  status: string;
};

const statusMap: Record<string, { label: string; className: string }> = {
  "INSTALLED": { label: "Installed", className: "badge badge-installed" },
  "READY TO DEPLOY": { label: "Ready", className: "badge badge-rtd" },
  "RTD": { label: "Ready", className: "badge badge-rtd" },
  "PAIRED": { label: "Paired", className: "badge badge-paired" },
  "DAMAGED": { label: "Damaged", className: "badge badge-damaged" },
  "LOST": { label: "Lost", className: "badge badge-lost" },
  "UNINSTALLED": { label: "Uninstalled", className: "badge badge-uninstalled" },
  "Available": { label: "Available", className: "badge badge-installed" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: "badge badge-uninstalled" };
  return <span className={config.className}>{config.label}</span>;
}
