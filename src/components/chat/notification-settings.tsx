"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Volume2, VolumeX, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface NotificationSettingsProps {
    /** Whether sound is enabled */
    soundEnabled: boolean;
    /** Toggle sound */
    onSoundToggle: (enabled: boolean) => void;
    /** Whether browser notifications are enabled */
    browserEnabled: boolean;
    /** Toggle browser notifications */
    onBrowserToggle: (enabled: boolean) => void;
    /** Current permission status */
    permission: NotificationPermission | null;
    /** Request permission callback */
    onRequestPermission: () => Promise<NotificationPermission>;
    /** Additional className */
    className?: string;
}

/**
 * Dropdown menu for notification settings.
 */
export function NotificationSettings({
    soundEnabled,
    onSoundToggle,
    browserEnabled,
    onBrowserToggle,
    permission,
    onRequestPermission,
    className,
}: NotificationSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleBrowserToggle = async (enabled: boolean) => {
        if (enabled && permission !== "granted") {
            const result = await onRequestPermission();
            if (result === "granted") {
                onBrowserToggle(true);
            }
        } else {
            onBrowserToggle(enabled);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", className)}
                    title="Configuración de notificaciones"
                >
                    {soundEnabled || browserEnabled ? (
                        <Bell className="h-4 w-4" />
                    ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Sound toggle */}
                <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                >
                    <div className="flex items-center gap-2">
                        {soundEnabled ? (
                            <Volume2 className="h-4 w-4" />
                        ) : (
                            <VolumeX className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>Sonido</span>
                    </div>
                    <Switch
                        checked={soundEnabled}
                        onCheckedChange={onSoundToggle}
                        className="ml-2"
                    />
                </DropdownMenuItem>

                {/* Browser notifications toggle */}
                <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                >
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>Notificaciones del navegador</span>
                    </div>
                    <Switch
                        checked={browserEnabled && permission === "granted"}
                        onCheckedChange={handleBrowserToggle}
                        disabled={permission === "denied"}
                        className="ml-2"
                    />
                </DropdownMenuItem>

                {/* Permission status */}
                {permission === "denied" && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador.
                        </div>
                    </>
                )}

                {permission === "default" && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-primary cursor-pointer"
                            onClick={onRequestPermission}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Permitir notificaciones
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
