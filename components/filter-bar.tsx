"use client"

import { cn } from "@/lib/utils"
import { categories, conditions } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SlidersHorizontal } from "lucide-react"

interface FilterBarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedCondition: string
  onConditionChange: (condition: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
}

export function FilterBar({
  selectedCategory,
  onCategoryChange,
  selectedCondition,
  onConditionChange,
  sortBy,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible pt-2 pb-2 scrollbar-hide">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-[transform,box-shadow,background-color,color,outline-color] duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.06] hover:shadow-[0_14px_28px_-14px_rgba(0,0,0,0.45)] hover:ring-2 hover:ring-primary/25 active:translate-y-0 active:scale-100",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex items-center gap-3">
        <Select value={selectedCondition} onValueChange={onConditionChange}>
        <SelectTrigger className="w-[140px] h-9 text-sm bg-card/90 border-border transition-all duration-300 ease-smooth transform-gpu hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Condition</SelectItem>
            {conditions.map((cond) => (
              <SelectItem key={cond} value={cond}>
                {cond}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[130px] h-9 text-sm bg-card/90 border-border transition-all duration-300 ease-smooth transform-gpu hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        {(selectedCategory !== "All" || selectedCondition !== "all") && (
          <button
            type="button"
            onClick={() => {
              onCategoryChange("All")
              onConditionChange("all")
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
