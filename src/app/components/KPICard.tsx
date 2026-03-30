import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  iconColor: string;
}

export default function KPICard({ title, value, change, icon: Icon, iconColor }: KPICardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-3xl mt-2">{value}</p>
          <div className="flex items-center gap-1 mt-3">
            <span
              className={`text-sm ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(change)}%
            </span>
            <span className="text-sm text-slate-500">vs last month</span>
          </div>
        </div>
        <div className={`${iconColor} p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
