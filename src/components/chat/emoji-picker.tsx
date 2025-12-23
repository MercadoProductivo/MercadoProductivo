"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Emojis organizados por categoría - nativos, sin fetch
const EMOJI_CATEGORIES = {
    "Caras": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷"],
    "Gestos": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🦿"],
    "Corazones": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
    "Objetos": ["📦", "🛒", "💰", "💵", "💴", "💶", "💷", "💳", "📱", "💻", "📧", "✉️", "📨", "📩", "📝", "📄", "📃", "🗂️", "📁", "📂", "🗃️", "📊", "📈", "📉", "📆", "📅"],
    "Símbolos": ["✅", "❌", "⭕", "❗", "❓", "💯", "🔥", "⚡", "💫", "⭐", "🌟", "✨", "🎉", "🎊", "🎁", "🏆", "🥇", "🥈", "🥉", "🔔", "🔕", "📢", "📣"],
};

type EmojiPickerProps = {
    onEmojiSelect: (emoji: string) => void;
    disabled?: boolean;
    className?: string;
};

export default function EmojiPicker({ onEmojiSelect, disabled, className }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>("Caras");

    const handleSelect = useCallback(
        (emoji: string) => {
            onEmojiSelect(emoji);
            setOpen(false);
        },
        [onEmojiSelect]
    );

    const categories = Object.keys(EMOJI_CATEGORIES) as (keyof typeof EMOJI_CATEGORIES)[];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    className={cn("h-8 w-8 rounded-full hover:bg-muted", className)}
                    aria-label="Insertar emoji"
                >
                    <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[320px] p-0 shadow-xl"
                side="top"
                align="start"
                sideOffset={8}
            >
                {/* Tabs de categorías */}
                <div className="flex gap-1 border-b p-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                                activeCategory === cat
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid de emojis */}
                <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-8 gap-1 p-2">
                        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, i) => (
                            <button
                                key={`${emoji}-${i}`}
                                onClick={() => handleSelect(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-md text-xl hover:bg-muted transition-colors"
                                title={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
