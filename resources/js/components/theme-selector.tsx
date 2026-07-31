import { Check, Moon, Palette, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { useThemeColor, type ThemeColor } from '@/hooks/use-theme';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const themeColorMap: Record<ThemeColor, { label: string; dot: string; activeRing: string }> = {
    blue: { label: 'Blue', dot: 'bg-blue-500', activeRing: 'ring-blue-400' },
    orange: { label: 'Orange', dot: 'bg-orange-500', activeRing: 'ring-orange-400' },
    green: { label: 'Green', dot: 'bg-green-500', activeRing: 'ring-green-400' },
    pink: { label: 'Pink', dot: 'bg-pink-500', activeRing: 'ring-pink-400' },
    purple: { label: 'Purple', dot: 'bg-purple-500', activeRing: 'ring-purple-400' },
    yellow: { label: 'Yellow', dot: 'bg-yellow-400', activeRing: 'ring-yellow-300' },
};

export default function ThemeSelector() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const { themeColor, updateThemeColor, themeColors } = useThemeColor();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-full border border-input bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Appearance settings"
                >
                    <Palette className="size-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {/* Appearance */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Mode
                </DropdownMenuLabel>
                <div className="flex gap-1 px-2 pb-1">
                    <button
                        onClick={() => updateAppearance('light')}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            resolvedAppearance === 'light'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent text-muted-foreground hover:text-accent-foreground',
                        )}
                    >
                        <Sun className="size-3.5" />
                        Light
                    </button>
                    <button
                        onClick={() => updateAppearance('dark')}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            resolvedAppearance === 'dark'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent text-muted-foreground hover:text-accent-foreground',
                        )}
                    >
                        <Moon className="size-3.5" />
                        Dark
                    </button>
                </div>

                <DropdownMenuSeparator />

                {/* Theme Color */}
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Palette className="size-3" />
                    Accent Color
                </DropdownMenuLabel>
                <div className="grid grid-cols-3 gap-1.5 px-2 pb-1">
                    {themeColors.map((color) => {
                        const config = themeColorMap[color];
                        const isActive = themeColor === color;
                        return (
                            <button
                                key={color}
                                onClick={() => updateThemeColor(color)}
                                className={cn(
                                    'flex flex-col items-center gap-1 rounded-md px-1 py-1.5 transition-colors',
                                    isActive
                                        ? 'bg-accent'
                                        : 'hover:bg-accent/50',
                                )}
                                aria-label={`${config.label} theme`}
                            >
                                <span
                                    className={cn(
                                        'block size-5 rounded-full transition-all',
                                        config.dot,
                                        isActive
                                            ? `ring-2 ${config.activeRing} ring-offset-1 ring-offset-background scale-110`
                                            : 'opacity-70 hover:opacity-100',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'text-[10px] font-medium',
                                        isActive
                                            ? 'text-accent-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {config.label}
                                </span>
                                {isActive && (
                                    <Check className="size-2.5 text-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
