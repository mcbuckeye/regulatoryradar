interface RelevanceBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function RelevanceBadge({
  score,
  size = "md",
}: RelevanceBadgeProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const rounded = Math.round(score);

  let bgColor: string;
  let textColor: string;

  if (rounded > 80) {
    bgColor = "bg-green-100";
    textColor = "text-green-800";
  } else if (rounded >= 50) {
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-800";
  } else {
    bgColor = "bg-gray-100";
    textColor = "text-gray-600";
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${bgColor} ${textColor} ${sizeClasses[size]}`}
      title={`Relevance score: ${rounded}%`}
    >
      {rounded}%
    </span>
  );
}
