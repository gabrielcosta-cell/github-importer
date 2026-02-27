import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmblaApi = UseEmblaCarouselType[1];

type FeaturedCasesCarouselProps<T extends { id: string }> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string;
};

export function FeaturedCasesCarousel<T extends { id: string }>(
  props: FeaturedCasesCarouselProps<T>
) {
  const { items, renderItem, className } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: "center", 
    dragFree: false,
    containScroll: false,
    loop: true,
    startIndex: items.length > 1 ? 1 : 0
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api: EmblaApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", () => onSelect(emblaApi));
    emblaApi.on("reInit", () => onSelect(emblaApi));
  }, [emblaApi, onSelect]);

  // Only show navigation if there's more than 1 item
  const showNavigation = items.length > 1;

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Cases em destaque"
    >
      <div ref={emblaRef} className="overflow-hidden px-2 sm:px-0">
        {/* Center alignment with partial side cards visible */}
        <div className="flex">
          {items.map((item) => (
            <div
              key={item.id}
              className="min-w-0 shrink-0 grow-0 basis-[88%] sm:basis-[85%] md:basis-[80%] lg:basis-[75%] px-2"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>

      {showNavigation && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 md:h-10 md:w-10 bg-white/90 backdrop-blur-sm border-0 shadow-lg text-secondary hover:bg-white transition-colors z-10"
            onClick={() => {
              if (!canScrollPrev) return;
              emblaApi?.scrollPrev();
            }}
            disabled={!canScrollPrev}
            aria-label="Anterior"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 md:h-10 md:w-10 bg-white/90 backdrop-blur-sm border-0 shadow-lg text-secondary hover:bg-white transition-colors z-10"
            onClick={() => {
              if (!canScrollNext) return;
              emblaApi?.scrollNext();
            }}
            disabled={!canScrollNext}
            aria-label="Próximo"
          >
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </>
      )}
    </div>
  );
}
