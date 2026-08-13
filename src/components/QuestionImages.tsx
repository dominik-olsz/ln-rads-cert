import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface QuestionImagesProps {
  images: string[];
  /** Called with the currently displayed image and its index when the main image is clicked. */
  onImageClick?: (url: string, index: number) => void;
  className?: string;
}

/**
 * Shows one main question image plus a thumbnail strip when several images exist.
 * Clicking a thumbnail promotes it to the main slot.
 */
const QuestionImages = ({ images, onImageClick, className }: QuestionImagesProps) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [images.join("|")]);

  if (images.length === 0) return null;

  const index = Math.min(active, images.length - 1);
  const main = images[index];

  return (
    <div className={cn("space-y-2", className)}>
      <img
        src={main}
        alt={`Question image ${index + 1}`}
        className="w-full max-h-[500px] object-contain rounded-lg border cursor-zoom-in hover:opacity-90 transition-opacity bg-muted"
        onClick={() => onImageClick?.(main, index)}
      />

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "shrink-0 h-16 w-20 rounded-md overflow-hidden border-2 transition-colors bg-muted",
                i === index ? "border-primary" : "border-border hover:border-muted-foreground"
              )}
            >
              <img src={url} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionImages;
