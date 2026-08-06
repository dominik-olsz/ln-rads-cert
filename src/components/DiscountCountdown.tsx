import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/pricing";

/** Live "ends in 2d 04:11:07" countdown. Renders nothing once the target passes. */
const DiscountCountdown = ({ until, className }: { until: string; className?: string }) => {
  const [parts, setParts] = useState(() => countdownParts(until));

  useEffect(() => {
    setParts(countdownParts(until));
    const id = setInterval(() => setParts(countdownParts(until)), 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!parts) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className={className}>
      {parts.days > 0 && `${parts.days}d `}
      {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
    </span>
  );
};

export default DiscountCountdown;
