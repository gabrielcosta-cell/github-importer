import { useState } from "react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstagramPostPreviewProps {
  images: Array<{ url: string; name: string }>;
  description?: string;
  compact?: boolean;
  clientName?: string;
}

export function InstagramPostPreview({ images, description, compact = false, clientName = "Cliente" }: InstagramPostPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div className={`border rounded-xl overflow-hidden bg-white ${compact ? 'max-w-xs' : 'max-w-md'} shadow-sm`}>
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gray-200" />
            </div>
          </div>
          <span className="font-semibold text-sm text-gray-900">{clientName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-5 w-5 text-gray-900" />
        </Button>
      </div>

      {/* Image carousel */}
      <div className="relative aspect-square bg-black">
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].name}
          className="w-full h-full object-contain"
        />
        
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-blue-500 w-2' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <Heart className="h-6 w-6 text-gray-900" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <MessageCircle className="h-6 w-6 text-gray-900" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <Send className="h-6 w-6 text-gray-900" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <Bookmark className="h-6 w-6 text-gray-900" />
          </Button>
        </div>

        {/* Likes */}
        <div className="mb-2">
          <span className="font-semibold text-sm text-gray-900">1.234 curtidas</span>
        </div>

        {/* Caption */}
        {description && (
          <div className="text-sm text-gray-900 mb-2">
            <span className="font-semibold mr-1">{clientName}</span>
            <span className="whitespace-pre-wrap">{description}</span>
          </div>
        )}

        {/* View comments */}
        <div className="text-sm text-gray-500 mb-2">
          Ver todos os 87 comentários
        </div>

        {/* Time */}
        <div className="text-xs text-gray-400 uppercase">
          Há 2 horas
        </div>
      </div>
    </div>
  );
}
