// Peta ikon kebiasaan → komponen lucide (import statis agar tree-shaking aman)
import {
  GlassWater,
  Dumbbell,
  BookOpen,
  NotebookPen,
  Flower2,
  WalletCards,
  Languages,
  Sparkles,
  Phone,
  Sprout,
  HeartPulse,
  Moon,
  Footprints,
  Bike,
  Music,
  BookMarked,
  Brain,
  Droplets,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export const HABIT_ICONS: Record<string, LucideIcon> = {
  "glass-water": GlassWater,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  "notebook-pen": NotebookPen,
  "flower-2": Flower2,
  "wallet-cards": WalletCards,
  languages: Languages,
  sparkles: Sparkles,
  phone: Phone,
  sprout: Sprout,
  "heart-pulse": HeartPulse,
  moon: Moon,
  footprints: Footprints,
  bike: Bike,
  music: Music,
  "book-marked": BookMarked,
  brain: Brain,
  droplets: Droplets,
  utensils: Utensils,
};

export function habitIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Sprout;
  return HABIT_ICONS[key] ?? Sprout;
}

// Warna kebiasaan → kelas tailwind (soft bg + deep text)
export const HABIT_COLOR: Record<string, { soft: string; deep: string; solid: string }> = {
  emerald: { soft: "bg-garden-soft", deep: "text-garden-deep", solid: "bg-garden" },
  amber: { soft: "bg-gold-soft", deep: "text-gold", solid: "bg-gold" },
  teal: { soft: "bg-vault-soft", deep: "text-vault-deep", solid: "bg-vault" },
  rose: { soft: "bg-writer-soft", deep: "text-writer-deep", solid: "bg-writer" },
  orange: { soft: "bg-studio-soft", deep: "text-studio-deep", solid: "bg-studio" },
  stone: { soft: "bg-secondary", deep: "text-foreground", solid: "bg-stone-500" },
};

export function habitColor(key: string | null | undefined) {
  if (!key) return HABIT_COLOR.emerald;
  return HABIT_COLOR[key] ?? HABIT_COLOR.emerald;
}
