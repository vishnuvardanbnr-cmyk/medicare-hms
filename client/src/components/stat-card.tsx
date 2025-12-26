import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  color?: "primary" | "secondary" | "accent";
}

export function StatCard({ title, value, icon: Icon, trend, className, color = "primary" }: StatCardProps) {
  const colorStyles = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <Card className={cn("border-none shadow-md hover:shadow-lg transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
            {trend && <p className="text-xs text-emerald-600 mt-2 font-medium">{trend}</p>}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorStyles[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
