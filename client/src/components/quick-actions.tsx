import { useLocation } from "wouter";
import { 
  UserPlus, 
  Calendar, 
  FileText, 
  Pill, 
  BedDouble,
  Ambulance,
  CreditCard,
  ClipboardList,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const actions = [
  { 
    label: "Register Patient", 
    icon: UserPlus, 
    href: "/patients",
    description: "Add new patient record"
  },
  { 
    label: "Book Appointment", 
    icon: Calendar, 
    href: "/appointments",
    description: "Schedule a new appointment"
  },
  { 
    label: "Create Prescription", 
    icon: ClipboardList, 
    href: "/prescriptions",
    description: "Write a new prescription"
  },
  { 
    label: "Add Lab Report", 
    icon: FileText, 
    href: "/lab-reports",
    description: "Upload lab results"
  },
  { 
    label: "Dispense Medicine", 
    icon: Pill, 
    href: "/pharmacy",
    description: "Process pharmacy order"
  },
  { 
    label: "Admit Patient", 
    icon: BedDouble, 
    href: "/admissions",
    description: "New hospital admission"
  },
  { 
    label: "Generate Bill", 
    icon: CreditCard, 
    href: "/billing",
    description: "Create patient invoice"
  },
  { 
    label: "Dispatch Ambulance", 
    icon: Ambulance, 
    href: "/ambulance",
    description: "Send ambulance service"
  },
];

export function QuickActions() {
  const [, navigate] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" data-testid="button-quick-actions">
          <Plus className="w-4 h-4" />
          Quick Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem 
            key={action.label}
            onClick={() => navigate(action.href)}
            className="cursor-pointer py-3"
            data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <action.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
